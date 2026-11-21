package com.codeuet.discussion;

import com.codeuet.common.*;
import com.codeuet.auth.AuthService;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class DiscussionController {
    final Db db;
    final AuthService auth;

    public DiscussionController(Db db, AuthService auth) {
        this.db = db;
        this.auth = auth;
    }

    boolean isContestRunning(long id) {
        return db.maybe(
                "SELECT 1 FROM contest_problems cp JOIN contests c ON c.id=cp.contest_id WHERE cp.problem_id=:id AND c.status='PUBLISHED' AND c.start_time<=NOW() AND c.end_time>NOW() LIMIT 1",
                db.m("id", id)) != null;
    }

    @GetMapping("/problems/{id}/tutorial")
    public Map<String, Object> tutorial(@PathVariable long id) {
        if (isContestRunning(id))
            throw ApiException.forbidden();
        return db.one("SELECT content,author_id,updated_at FROM tutorials WHERE problem_id=:id AND is_published=true",
                db.m("id", id));
    }

    @PutMapping("/problems/{id}/tutorial")
    public Map<String, Object> saveTutorial(@PathVariable long id, @RequestBody Map<String, Object> b) {
        auth.requireSetter();
        var p = db.one("SELECT author_id FROM problems WHERE id=:id", db.m("id", id));
        auth.ownership(((Number) p.get("author_id")).longValue());
        db.exec("INSERT INTO tutorials(problem_id,author_id,content,is_published) VALUES (:p,:u,:c,:pub) ON CONFLICT(problem_id) DO UPDATE SET content=:c,is_published=:pub,updated_at=NOW()",
                db.m("p", id, "u", auth.userId(), "c", b.getOrDefault("content", ""), "pub",
                        b.getOrDefault("isPublished", false)));
        return Map.of("saved", true);
    }

    @GetMapping("/problems/{id}/comments")
    public List<Map<String, Object>> comments(@PathVariable long id) {
        return db.list(
                "SELECT c.id,c.parent_id,c.content,c.vote_score,c.created_at,u.username,COALESCE(NULLIF(BTRIM(u.full_name), ''), u.username) AS full_name FROM comments c JOIN users u ON u.id=c.user_id WHERE c.problem_id=:id AND c.deleted_at IS NULL AND NOT c.is_hidden ORDER BY c.created_at DESC",
                db.m("id", id));
    }

    @PostMapping("/problems/{id}/comments")
    public ResponseEntity<?> post(@PathVariable long id, @RequestBody Map<String, Object> b) {
        long user = auth.userId();
        if (isContestRunning(id))
            throw ApiException.forbidden();
        String content = String.valueOf(b.getOrDefault("content", "")).trim();
        if (content.isEmpty() || content.length() > 5000)
            throw ApiException.bad("Bình luận phải có 1–5000 ký tự");
        Object parent = b.get("parentId");
        if (parent != null && db.maybe("SELECT id FROM comments WHERE id=:id AND problem_id=:p",
                db.m("id", parent, "p", id)) == null)
            throw ApiException.bad("Bình luận cha không hợp lệ");
        long cid = db.insert(
                "INSERT INTO comments(problem_id,user_id,parent_id,content) VALUES (:p,:u,:parent,:c) RETURNING id",
                db.m("p", id, "u", user, "parent", parent, "c", content));
        return ResponseEntity.status(201).body(Map.of("id", cid, "content", content));
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<?> delete(@PathVariable long id) {
        var c = db.one("SELECT user_id FROM comments WHERE id=:id", db.m("id", id));
        auth.ownership(((Number) c.get("user_id")).longValue());
        db.exec("UPDATE comments SET deleted_at=NOW() WHERE id=:id", db.m("id", id));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/comments/{id}/vote")
    public Map<String, Object> vote(@PathVariable long id, @RequestBody Map<String, Object> b) {
        long uid = auth.userId();
        int value = ((Number) b.getOrDefault("value", 0)).intValue();
        if (Math.abs(value) > 1)
            throw ApiException.bad("Vote chỉ -1, 0 hoặc 1");
        db.one("SELECT id FROM comments WHERE id=:id AND deleted_at IS NULL", db.m("id", id));
        if (value == 0)
            db.exec("DELETE FROM comment_votes WHERE comment_id=:c AND user_id=:u", db.m("c", id, "u", uid));
        else
            db.exec("INSERT INTO comment_votes(comment_id,user_id,value) VALUES (:c,:u,:v) ON CONFLICT(comment_id,user_id) DO UPDATE SET value=:v",
                    db.m("c", id, "u", uid, "v", value));
        db.exec("UPDATE comments SET vote_score=(SELECT COALESCE(SUM(value),0) FROM comment_votes WHERE comment_id=:id) WHERE id=:id",
                db.m("id", id));
        return Map.of("updated", true);
    }
}
