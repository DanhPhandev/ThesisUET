package com.codeuet.submission;

import com.codeuet.auth.AuthService;
import com.codeuet.common.*;
import java.util.*;
import java.util.concurrent.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class SubmissionController {
    private final Db db;
    private final AuthService auth;
    private final Judge0Client judge;
    private final ConcurrentHashMap<Long, Long> lastSubmit = new ConcurrentHashMap<>();

    public SubmissionController(Db db, AuthService auth, Judge0Client judge) {
        this.db = db;
        this.auth = auth;
        this.judge = judge;
    }

    @GetMapping("/languages")
    public List<Map<String, Object>> languages() {
        return db.list("SELECT id,code,name FROM languages WHERE is_active=true AND code IN ('cpp','python3') ORDER BY CASE code WHEN 'cpp' THEN 1 ELSE 2 END", db.m());
    }

    public record Submit(Long problemId, String language, String sourceCode, Long contestId) {
    }

    private Map<String, Object> language(String s) {
        if (!"cpp".equals(s) && !"python3".equals(s))
            throw ApiException.bad("Chỉ hỗ trợ ngôn ngữ C++ và Python 3");
        return db.one("SELECT * FROM languages WHERE code=:code AND is_active=true", db.m("code", s));
    }

    @PostMapping("/run")
    public Map<String, Object> run(@RequestBody Map<String, Object> body) {
        auth.requireUser();
        String src = String.valueOf(body.getOrDefault("sourceCode", ""));
        if (src.isBlank() || src.length() > 65536)
            throw ApiException.bad("Code trống hoặc vượt 64KB");
        Map<String, Object> lang = language(String.valueOf(body.get("language")));
        long problemId = ((Number) body.get("problemId")).longValue();
        Map<String, Object> problem = db.one(
                "SELECT * FROM problems WHERE id=:id AND deleted_at IS NULL AND visibility='PUBLIC'",
                db.m("id", problemId));
        try {
            Map<String, Object> result = judge.judge(((Number) lang.get("judge0_id")).intValue(), src,
                    String.valueOf(body.getOrDefault("stdin", "")), null,
                    ((Number) problem.get("time_limit_ms")).intValue(),
                    ((Number) problem.get("memory_limit_mb")).intValue());
            Map<String, Object> r = new HashMap<>();
            for (String key : List.of("stdout", "stderr", "compile_output", "message", "time", "memory", "status"))
                r.put(key, result.get(key));
            return r;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "JUDGE_UNAVAILABLE",
                    "Judge0 chưa sẵn sàng: " + e.getClass().getSimpleName());
        }
    }

    @PostMapping("/submissions")
    public ResponseEntity<?> submit(@RequestBody Submit b) {
        long uid = auth.userId();
        if (b.problemId() == null || b.language() == null || b.sourceCode() == null || b.sourceCode().isBlank()
                || b.sourceCode().length() > 65536)
            throw ApiException.bad("Bài nộp phải có problemId, language, sourceCode (<=64KB)");
        long now = System.currentTimeMillis();
        Long last = lastSubmit.get(uid);
        if (last != null && now - last < 5000)
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", "Chỉ được nộp một bài mỗi 5 giây");
        Map<String, Object> lang = language(b.language());
        Map<String, Object> prob = db.one("SELECT * FROM problems WHERE id=:id AND deleted_at IS NULL",
                db.m("id", b.problemId()));
        Long contest = b.contestId();
        if (contest == null) {
            if (!"PUBLIC".equals(prob.get("visibility")))
                throw ApiException.forbidden();
        } else {
            Map<String, Object> c = db.one("SELECT * FROM contests WHERE id=:id", db.m("id", contest));
            if (!"PUBLISHED".equals(c.get("status"))
                    || db.list("SELECT 1 FROM contests WHERE id=:id AND start_time<=NOW() AND end_time>NOW()",
                            db.m("id", contest)).isEmpty())
                throw new ApiException(HttpStatus.CONFLICT, "CONTEST_NOT_RUNNING",
                        "Cuộc thi chưa bắt đầu hoặc đã kết thúc");
            if (db.maybe("SELECT 1 FROM contest_registrations WHERE contest_id=:c AND user_id=:u",
                    db.m("c", contest, "u", uid)) == null)
                throw ApiException.forbidden();
            if (db.maybe("SELECT 1 FROM contest_problems WHERE contest_id=:c AND problem_id=:p",
                    db.m("c", contest, "p", b.problemId())) == null)
                throw ApiException.forbidden();
        }
        if (db.maybe("SELECT id FROM test_cases WHERE problem_id=:p LIMIT 1", db.m("p", b.problemId())) == null)
            throw ApiException.bad("Bài chưa có test case");
        long id = db.insert(
                "INSERT INTO submissions(user_id,problem_id,contest_id,language_id,source_code) VALUES (:u,:p,:c,:l,:s) RETURNING id",
                db.m("u", uid, "p", b.problemId(), "c", contest, "l", lang.get("id"), "s", b.sourceCode()));
        lastSubmit.put(uid, now);
        return ResponseEntity.status(202).body(Map.of("id", id, "verdict", "PENDING"));
    }

    @GetMapping("/submissions/{id}")
    public Map<String, Object> result(@PathVariable long id) {
        // Authenticate and authorize the entire submission, not only its source code.
        long viewerId = auth.userId();
        Map<String, Object> row = db.one(
                "SELECT s.*,u.username,COALESCE(NULLIF(BTRIM(u.full_name), ''), u.username) AS full_name,p.title AS problem_title,p.slug AS problem_slug,l.code AS language FROM submissions s JOIN users u ON u.id=s.user_id JOIN problems p ON p.id=s.problem_id JOIN languages l ON l.id=s.language_id WHERE s.id=:id",
                db.m("id", id));
        if (((Number) row.get("user_id")).longValue() != viewerId && !auth.isAdmin())
            throw ApiException.forbidden();
        Map<String, Object> result = new LinkedHashMap<>(row);
        result.put("tests", db.list(
                "SELECT t.order_index,r.verdict,r.time_ms,r.memory_kb FROM submission_test_results r JOIN test_cases t ON t.id=r.test_case_id WHERE r.submission_id=:id ORDER BY t.order_index",
                db.m("id", id)));
        return result;
    }

    @GetMapping("/submissions")
    public Map<String, Object> submissions(@RequestParam(required = false) String user,
            @RequestParam(required = false) Long problem, @RequestParam(required = false) Long contest,
            @RequestParam(required = false) String verdict, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        long viewerId = auth.userId();
        boolean admin = auth.isAdmin();
        String where = " WHERE 1=1";
        if (!admin)
            where += " AND s.user_id=:viewer";
        else if (user != null && !user.isBlank())
            where += " AND u.username=:u";
        if (problem != null)
            where += " AND s.problem_id=:p";
        if (contest != null)
            where += " AND s.contest_id=:c";
        if (verdict != null && !verdict.isBlank())
            where += " AND s.verdict=:v";
        Map<String, Object> params = db.m("viewer", viewerId, "u", user, "p", problem, "c", contest, "v", verdict, "limit",
                Math.min(Math.max(size, 1), 100), "offset", Math.max(page, 0) * Math.min(Math.max(size, 1), 100));
        List<Map<String, Object>> rows = db.list(
                "SELECT s.id,s.created_at,s.verdict,s.score,s.passed_tests,s.total_tests,s.problem_id,s.contest_id,u.username,COALESCE(NULLIF(BTRIM(u.full_name), ''), u.username) AS full_name,p.title AS problem_title,p.slug AS problem_slug,l.code AS language FROM submissions s JOIN users u ON u.id=s.user_id JOIN problems p ON p.id=s.problem_id JOIN languages l ON l.id=s.language_id"
                        + where + " ORDER BY s.created_at DESC LIMIT :limit OFFSET :offset",
                params);
        long total = ((Number) db
                .one("SELECT COUNT(*) AS n FROM submissions s JOIN users u ON u.id=s.user_id" + where, params).get("n"))
                .longValue();
        int sz = ((Number) params.get("limit")).intValue();
        return Map.of("content", rows, "page", Math.max(0, page), "size", sz, "totalElements", total, "totalPages",
                (total + sz - 1) / sz);
    }
}
