package com.codeuet.contest;

import com.codeuet.common.*;
import com.codeuet.auth.AuthService;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class ContestController {
    final Db db;
    final AuthService auth;

    public ContestController(Db db, AuthService auth) {
        this.db = db;
        this.auth = auth;
    }

    @GetMapping("/contests")
    public List<Map<String, Object>> list(@RequestParam(required = false) String phase) {
        String filter = "";
        if ("upcoming".equals(phase))
            filter = " AND c.start_time>NOW()";
        else if ("running".equals(phase))
            filter = " AND c.start_time<=NOW() AND c.end_time>NOW()";
        else if ("ended".equals(phase))
            filter = " AND c.end_time<=NOW()";
        return db.list(
                "SELECT c.id,c.slug,c.title,c.description,c.rule,c.status,c.start_time,c.end_time,(SELECT COUNT(*) FROM contest_registrations r WHERE r.contest_id=c.id) AS participants,CASE WHEN c.start_time>NOW() THEN 'upcoming' WHEN c.end_time<=NOW() THEN 'ended' ELSE 'running' END AS phase FROM contests c WHERE c.status='PUBLISHED'"
                        + filter + " ORDER BY c.start_time DESC",
                db.m());
    }

    @GetMapping("/contests/{slug}")
    public Map<String, Object> detail(@PathVariable String slug) {
        var r = new LinkedHashMap<>(
                db.one("SELECT * FROM contests WHERE slug=:slug AND status='PUBLISHED'", db.m("slug", slug)));
        r.remove("access_code");
        r.put("problems", db.list(
                "SELECT cp.label,cp.points,cp.problem_id,p.title,p.difficulty FROM contest_problems cp JOIN problems p ON p.id=cp.problem_id WHERE cp.contest_id=:id ORDER BY cp.order_index",
                db.m("id", r.get("id"))));
        try {
            r.put("registered", db.maybe("SELECT 1 FROM contest_registrations WHERE contest_id=:c AND user_id=:u",
                    db.m("c", r.get("id"), "u", auth.userId())) != null);
        } catch (Exception e) {
            r.put("registered", false);
        }
        return r;
    }

    @PostMapping("/contests/{id}/register")
    public Map<String, Object> register(@PathVariable long id, @RequestBody(required = false) Map<String, Object> b) {
        long uid = auth.userId();
        var c = db.one("SELECT * FROM contests WHERE id=:id AND status='PUBLISHED' AND end_time>NOW()", db.m("id", id));
        if (Boolean.FALSE.equals(c.get("is_public"))
                && !Objects.equals(c.get("access_code"), b == null ? null : b.get("accessCode")))
            throw ApiException.forbidden();
        db.exec("INSERT INTO contest_registrations(contest_id,user_id) VALUES (:c,:u) ON CONFLICT DO NOTHING",
                db.m("c", id, "u", uid));
        db.exec("INSERT INTO user_achievements(user_id,achievement_id) SELECT :u,id FROM achievements WHERE code='FIRST_CONTEST' ON CONFLICT DO NOTHING",
                db.m("u", uid));
        return Map.of("registered", true);
    }

    @DeleteMapping("/contests/{id}/register")
    public ResponseEntity<?> unregister(@PathVariable long id) {
        long uid = auth.userId();
        if (db.maybe("SELECT 1 FROM contests WHERE id=:id AND start_time>NOW()", db.m("id", id)) == null)
            throw ApiException.bad("Cuộc thi đã bắt đầu");
        db.exec("DELETE FROM contest_registrations WHERE contest_id=:c AND user_id=:u", db.m("c", id, "u", uid));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/contests/{id}/enter")
    public Map<String, Object> enter(@PathVariable long id) {
        long uid = auth.userId();
        var c = db.one(
                "SELECT * FROM contests WHERE id=:id AND status='PUBLISHED' AND start_time<=NOW() AND end_time>NOW()",
                db.m("id", id));
        if (db.exec(
                "UPDATE contest_registrations SET first_entered_at=COALESCE(first_entered_at,NOW()) WHERE contest_id=:c AND user_id=:u",
                db.m("c", id, "u", uid)) == 0)
            throw ApiException.forbidden();
        return Map.of("serverTime", java.time.Instant.now(), "endTime", c.get("end_time"), "problems", db.list(
                "SELECT cp.label,p.id AS problem_id,p.title,p.slug,p.difficulty FROM contest_problems cp JOIN problems p ON p.id=cp.problem_id WHERE cp.contest_id=:c ORDER BY cp.order_index",
                db.m("c", id)));
    }

    @GetMapping("/contests/{id}/my-results")
    public List<Map<String, Object>> myResults(@PathVariable long id) {
        return db.list(
                "SELECT p.title,cp.label,cr.is_solved,cr.best_score,cr.attempts FROM contest_problems cp JOIN problems p ON p.id=cp.problem_id LEFT JOIN contest_problem_results cr ON cr.contest_id=cp.contest_id AND cr.problem_id=cp.problem_id AND cr.user_id=:u WHERE cp.contest_id=:c ORDER BY cp.order_index",
                db.m("c", id, "u", auth.userId()));
    }

    @GetMapping("/contests/{id}/standings")
    public List<Map<String, Object>> standings(@PathVariable long id) {
        return db.list(
                "SELECT v.rank,v.username,NULLIF(BTRIM(u.full_name), '') AS full_name,v.solved,v.total_score,v.penalty FROM v_contest_standings v JOIN users u ON u.id=v.user_id WHERE v.contest_id=:id ORDER BY v.rank LIMIT 200",
                db.m("id", id));
    }

    @GetMapping("/admin/contests")
    public List<Map<String, Object>> mine() {
        auth.requireSetter();
        return db.list("SELECT * FROM contests WHERE created_by=:id OR :admin ORDER BY created_at DESC",
                db.m("id", auth.userId(), "admin", auth.isAdmin()));
    }

    public Map<String, Object> owned(long id) {
        var c = db.one("SELECT * FROM contests WHERE id=:id", db.m("id", id));
        auth.ownership(((Number) c.get("created_by")).longValue());
        return c;
    }

    @PostMapping("/admin/contests")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> b) {
        auth.requireSetter();
        long id = db.insert(
                "INSERT INTO contests(slug,title,description,rule,start_time,end_time,created_by) VALUES (:slug,:title,:desc,:rule,CAST(:st AS timestamptz),CAST(:en AS timestamptz),:uid) RETURNING id",
                db.m("slug", b.get("slug"), "title", b.get("title"), "desc", b.getOrDefault("description", ""), "rule",
                        b.getOrDefault("rule", "ICPC"), "st", b.get("startTime"), "en", b.get("endTime"), "uid",
                        auth.userId()));
        return ResponseEntity.status(201).body(db.one("SELECT * FROM contests WHERE id=:id", db.m("id", id)));
    }

    @PutMapping("/admin/contests/{id}/problems")
    public Map<String, Object> setProblems(@PathVariable long id, @RequestBody List<Map<String, Object>> list) {
        var c = owned(id);
        if (!"DRAFT".equals(c.get("status")))
            throw ApiException.bad("Chỉ sửa bài trước khi xuất bản");
        db.exec("DELETE FROM contest_problems WHERE contest_id=:id", db.m("id", id));
        for (int i = 0; i < list.size(); i++) {
            var p = list.get(i);
            db.exec("INSERT INTO contest_problems(contest_id,problem_id,label,points,order_index) VALUES (:c,:p,:l,:pts,:o)",
                    db.m("c", id, "p", p.get("problemId"), "l",
                            p.getOrDefault("label", String.valueOf((char) ('A' + i))), "pts",
                            p.getOrDefault("points", 100), "o", i));
        }
        return Map.of("count", list.size());
    }

    @PostMapping("/admin/contests/{id}/publish")
    public Map<String, Object> publish(@PathVariable long id) {
        owned(id);
        if (db.maybe("SELECT 1 FROM contest_problems WHERE contest_id=:id LIMIT 1", db.m("id", id)) == null)
            throw ApiException.bad("Cần ít nhất 1 bài");
        int n = db.exec("UPDATE contests SET status='PUBLISHED' WHERE id=:id AND status='DRAFT' AND start_time>NOW()",
                db.m("id", id));
        if (n == 0)
            throw ApiException.bad("Không thể xuất bản cuộc thi đã bắt đầu");
        return Map.of("status", "PUBLISHED");
    }

    @PostMapping("/admin/contests/{id}/cancel")
    public Map<String, Object> cancel(@PathVariable long id) {
        owned(id);
        db.exec("UPDATE contests SET status='CANCELLED' WHERE id=:id", db.m("id", id));
        return Map.of("status", "CANCELLED");
    }
}
