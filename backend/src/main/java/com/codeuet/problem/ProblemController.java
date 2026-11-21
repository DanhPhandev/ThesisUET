package com.codeuet.problem;

import com.codeuet.common.*;
import com.codeuet.auth.AuthService;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class ProblemController {
    private final Db db;
    private final AuthService auth;

    public ProblemController(Db db, AuthService auth) {
        this.db = db;
        this.auth = auth;
    }

    @GetMapping("/problems")
    public Map<String, Object> list(@RequestParam(defaultValue = "") String q,
            @RequestParam(required = false) String difficulty, @RequestParam(required = false) String tags,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Map<String, Object> p = db.m("q", "%" + q + "%", "diff", difficulty, "tag", tags, "limit",
                Math.min(Math.max(size, 1), 100), "offset", Math.max(0, page) * Math.min(Math.max(size, 1), 100));
        String where = " WHERE p.deleted_at IS NULL AND p.visibility='PUBLIC' AND (p.title ILIKE :q OR p.slug ILIKE :q)";
        if (difficulty != null && !difficulty.isBlank())
            where += " AND p.difficulty=:diff";
        if (tags != null && !tags.isBlank())
            where += " AND EXISTS(SELECT 1 FROM problem_tags pt JOIN tags t ON t.id=pt.tag_id WHERE pt.problem_id=p.id AND t.slug=:tag)";
        List<Map<String, Object>> rows = db.list(
                "SELECT p.id,p.slug,p.title,p.statement,p.difficulty,p.submission_count,p.accepted_count,p.time_limit_ms,p.created_at,COALESCE((SELECT string_agg(t.name,', ') FROM problem_tags pt JOIN tags t ON t.id=pt.tag_id WHERE pt.problem_id=p.id),'') AS tags FROM problems p"
                        + where + " ORDER BY p.created_at DESC LIMIT :limit OFFSET :offset",
                p);
        long total = ((Number) db.one("SELECT COUNT(*) AS total FROM problems p" + where, p).get("total")).longValue();
        int limit = ((Number) p.get("limit")).intValue();
        return Map.of("content", rows, "page", Math.max(page, 0), "size", limit, "totalElements", total, "totalPages",
                (total + limit - 1) / limit);
    }

    @GetMapping("/problems/mine")
    public List<Map<String, Object>> mine() {
        auth.requireSetter();
        return db.list(
                "SELECT id,title,slug,difficulty,visibility,created_at FROM problems WHERE author_id=:uid AND deleted_at IS NULL ORDER BY created_at DESC",
                db.m("uid", auth.userId()));
    }

    @GetMapping("/problems/{slug}")
    public Map<String, Object> get(@PathVariable String slug) {
        Map<String, Object> p = db.one(
                "SELECT p.*,u.username AS author FROM problems p JOIN users u ON u.id=p.author_id WHERE p.slug=:slug AND p.deleted_at IS NULL",
                db.m("slug", slug));
        if (!"PUBLIC".equals(p.get("visibility"))) {
            try {
                auth.ownership(((Number) p.get("author_id")).longValue());
            } catch (Exception ex) {
                if (!"CONTEST_ONLY".equals(p.get("visibility")) || db.maybe(
                        "SELECT 1 FROM contest_problems cp JOIN contests c ON c.id=cp.contest_id JOIN contest_registrations cr ON cr.contest_id=c.id WHERE cp.problem_id=:p AND cr.user_id=:u AND c.status='PUBLISHED' AND c.start_time<=NOW() AND c.end_time>NOW()",
                        db.m("p", p.get("id"), "u", auth.userId())) == null)
                    throw ApiException.notFound();
            }
        }
        Map<String, Object> r = new LinkedHashMap<>(p);
        r.remove("deleted_at");
        r.put("samples", db.list(
                "SELECT id,input,expected_output,order_index FROM test_cases WHERE problem_id=:id AND is_sample ORDER BY order_index",
                db.m("id", p.get("id"))));
        r.put("tags", db.list(
                "SELECT t.slug,t.name FROM tags t JOIN problem_tags pt ON pt.tag_id=t.id WHERE pt.problem_id=:id",
                db.m("id", p.get("id"))));
        return r;
    }

    @GetMapping("/tags")
    public List<Map<String, Object>> tags() {
        return db.list("SELECT * FROM tags ORDER BY name", db.m());
    }

    @PostMapping("/tags")
    public Map<String, Object> createTag(@RequestBody Map<String, String> b) {
        auth.requireAdmin();
        long id = db.insert("INSERT INTO tags(name,slug) VALUES (:n,:s) RETURNING id",
                db.m("n", b.get("name"), "s", b.get("slug")));
        return db.one("SELECT * FROM tags WHERE id=:id", db.m("id", id));
    }

    @PostMapping("/problems")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        auth.requireSetter();
        String title = String.valueOf(body.getOrDefault("title", "")).trim();
        if (title.isEmpty())
            throw ApiException.bad("Tên bài không được trống");
        String slug = String.valueOf(body.getOrDefault("slug", title.toLowerCase().replace(' ', '-'))).trim();
        String level = String.valueOf(body.getOrDefault("difficulty", "EASY"));
        if (!List.of("EASY", "MEDIUM", "HARD").contains(level))
            throw ApiException.bad("Độ khó không hợp lệ");
        long id = db.insert(
                "INSERT INTO problems(title,slug,statement,input_format,output_format,constraints_text,difficulty,author_id) VALUES (:t,:s,:st,:i,:o,:c,:d,:uid) RETURNING id",
                db.m("t", title, "s", slug, "st", body.getOrDefault("statement", ""), "i", body.get("inputFormat"), "o",
                        body.get("outputFormat"), "c", body.get("constraintsText"), "d", level, "uid", auth.userId()));
        return ResponseEntity.status(201).body(db.one("SELECT * FROM problems WHERE id=:id", db.m("id", id)));
    }

    public Map<String, Object> owned(long id) {
        Map<String, Object> p = db.one("SELECT * FROM problems WHERE id=:id AND deleted_at IS NULL", db.m("id", id));
        auth.ownership(((Number) p.get("author_id")).longValue());
        return p;
    }

    @PutMapping("/problems/{id}")
    public Map<String, Object> update(@PathVariable long id, @RequestBody Map<String, Object> b) {
        owned(id);
        String level = String.valueOf(b.getOrDefault("difficulty", "EASY"));
        if (!List.of("EASY", "MEDIUM", "HARD").contains(level))
            throw ApiException.bad("Độ khó không hợp lệ");
        db.exec("UPDATE problems SET title=:t,statement=:s,input_format=:i,output_format=:o,constraints_text=:c,difficulty=:d,updated_at=NOW() WHERE id=:id",
                db.m("t", b.get("title"), "s", b.get("statement"), "i", b.get("inputFormat"), "o",
                        b.get("outputFormat"), "c", b.get("constraintsText"), "d", level, "id", id));
        return db.one("SELECT * FROM problems WHERE id=:id", db.m("id", id));
    }

    @DeleteMapping("/problems/{id}")
    public ResponseEntity<?> delete(@PathVariable long id) {
        owned(id);
        long ongoing = ((Number) db.one(
                "SELECT COUNT(*) AS n FROM contest_problems cp JOIN contests c ON c.id=cp.contest_id WHERE cp.problem_id=:id AND c.end_time>NOW() AND c.status='PUBLISHED'",
                db.m("id", id)).get("n")).longValue();
        if (ongoing > 0)
            throw ApiException.bad("Không được xóa bài đang thuộc contest chưa kết thúc");
        db.exec("UPDATE problems SET deleted_at=NOW() WHERE id=:id", db.m("id", id));
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/problems/{id}/visibility")
    public Map<String, Object> visibility(@PathVariable long id, @RequestBody Map<String, String> b) {
        owned(id);
        String v = b.get("visibility");
        if (!List.of("DRAFT", "PUBLIC", "CONTEST_ONLY", "PENDING_REVIEW").contains(v))
            throw ApiException.bad("Trạng thái không hợp lệ");
        if (v.equals("PUBLIC")
                && ((Number) db.one("SELECT COUNT(*) AS n FROM test_cases WHERE problem_id=:id", db.m("id", id))
                        .get("n")).longValue() == 0)
            throw ApiException.bad("Phải có ít nhất một test case");
        db.exec("UPDATE problems SET visibility=:v WHERE id=:id", db.m("v", v, "id", id));
        return Map.of("visibility", v);
    }

    @GetMapping("/problems/{id}/testcases")
    public List<Map<String, Object>> tests(@PathVariable long id) {
        owned(id);
        return db.list("SELECT * FROM test_cases WHERE problem_id=:id ORDER BY order_index", db.m("id", id));
    }

    @PostMapping("/problems/{id}/testcases")
    public Map<String, Object> addTest(@PathVariable long id, @RequestBody Map<String, Object> b) {
        owned(id);
        int index = ((Number) b.getOrDefault("orderIndex", 1)).intValue();
        long tc = db.insert(
                "INSERT INTO test_cases(problem_id,input,expected_output,is_sample,weight,order_index) VALUES (:id,:in,:out,:sample,:weight,:idx) RETURNING id",
                db.m("id", id, "in", b.getOrDefault("input", ""), "out", b.getOrDefault("expectedOutput", ""), "sample",
                        b.getOrDefault("isSample", false), "weight", b.getOrDefault("weight", 1), "idx", index));
        return db.one("SELECT * FROM test_cases WHERE id=:id", db.m("id", tc));
    }

    @DeleteMapping("/problems/{id}/testcases/{testId}")
    public ResponseEntity<?> removeTest(@PathVariable long id, @PathVariable long testId) {
        owned(id);
        db.exec("DELETE FROM test_cases WHERE id=:tc AND problem_id=:id", db.m("tc", testId, "id", id));
        return ResponseEntity.noContent().build();
    }
}
