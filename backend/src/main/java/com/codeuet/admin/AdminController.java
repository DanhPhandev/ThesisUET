package com.codeuet.admin;

import com.codeuet.common.*;
import com.codeuet.auth.AuthService;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {
    final Db db;
    final AuthService auth;

    public AdminController(Db db, AuthService auth) {
        this.db = db;
        this.auth = auth;
    }

    void audit(String action, String target, long id) {
        db.exec("INSERT INTO audit_logs(actor_id,action,target_type,target_id) VALUES (:a,:act,:t,:id)",
                db.m("a", auth.userId(), "act", action, "t", target, "id", id));
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        auth.requireAdmin();
        return db.one(
                "SELECT (SELECT COUNT(*) FROM users) AS users,(SELECT COUNT(*) FROM submissions WHERE created_at>=CURRENT_DATE) AS submissions_today,(SELECT COUNT(*) FROM contests WHERE status='PUBLISHED' AND start_time<=NOW() AND end_time>NOW()) AS running_contests,(SELECT COUNT(*) FILTER(WHERE verdict='AC') FROM submissions) AS accepted,(SELECT COUNT(*) FROM submissions) AS total_submissions",
                db.m());
    }

    @GetMapping("/users")
    public List<Map<String, Object>> users(@RequestParam(defaultValue = "") String q) {
        auth.requireAdmin();
        return db.list(
                "SELECT id,username,COALESCE(NULLIF(BTRIM(full_name), ''), username) AS full_name,email::text AS email,role,status,created_at FROM users WHERE username ILIKE :q OR COALESCE(full_name, '') ILIKE :q OR email::text ILIKE :q ORDER BY id DESC LIMIT 100",
                db.m("q", "%" + q + "%"));
    }

    @Transactional
    @PatchMapping("/users/{id}/role")
    public Map<String, Object> role(@PathVariable long id, @RequestBody Map<String, String> body) {
        auth.requireAdmin();
        String nextRole = body == null ? null : body.get("role");
        if (nextRole == null || !List.of("USER", "SETTER", "ADMIN").contains(nextRole))
            throw ApiException.bad("Vai trò không hợp lệ");
        if (id == auth.userId())
            throw ApiException.bad("Bạn không thể tự thay đổi quyền của mình");

        // Lock the target while updating, then ensure an admin always remains.
        Map<String, Object> target = db.maybe("SELECT id,role,status FROM users WHERE id=:id FOR UPDATE", db.m("id", id));
        if (target == null) throw ApiException.notFound();
        String currentRole = String.valueOf(target.get("role"));
        if (currentRole.equals(nextRole)) return Map.of("role", currentRole);
        if ("ADMIN".equals(currentRole) && "ACTIVE".equals(target.get("status")) && !"ADMIN".equals(nextRole)) {
            Map<String, Object> count = db.one("SELECT COUNT(*) AS total FROM users WHERE role='ADMIN' AND status='ACTIVE'", db.m());
            if (((Number) count.get("total")).longValue() <= 1)
                throw ApiException.bad("Không thể hạ quyền quản trị viên cuối cùng");
        }

        db.exec("UPDATE users SET role=:r,updated_at=NOW() WHERE id=:id", db.m("r", nextRole, "id", id));
        audit("ROLE_CHANGED", "USER", id);
        return Map.of("role", nextRole);
    }

    @Transactional
    @PatchMapping("/users/{id}/status")
    public Map<String, Object> status(@PathVariable long id, @RequestBody Map<String, String> body) {
        auth.requireAdmin();
        String nextStatus = body == null ? null : body.get("status");
        if (nextStatus == null || !List.of("ACTIVE", "LOCKED", "BANNED").contains(nextStatus))
            throw ApiException.bad("Trạng thái không hợp lệ");
        if (id == auth.userId() && !"ACTIVE".equals(nextStatus))
            throw ApiException.bad("Không thể tự khóa tài khoản");

        Map<String, Object> target = db.maybe("SELECT id,role,status FROM users WHERE id=:id FOR UPDATE", db.m("id", id));
        if (target == null) throw ApiException.notFound();
        if (nextStatus.equals(target.get("status"))) return Map.of("status", nextStatus);
        if ("ADMIN".equals(target.get("role")) && "ACTIVE".equals(target.get("status")) && !"ACTIVE".equals(nextStatus)) {
            Map<String, Object> count = db.one("SELECT COUNT(*) AS total FROM users WHERE role='ADMIN' AND status='ACTIVE'", db.m());
            if (((Number) count.get("total")).longValue() <= 1)
                throw ApiException.bad("Không thể khóa quản trị viên đang hoạt động cuối cùng");
        }

        db.exec("UPDATE users SET status=:s,updated_at=NOW() WHERE id=:id", db.m("s", nextStatus, "id", id));
        if (!"ACTIVE".equals(nextStatus)) {
            db.exec("UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=:id AND revoked_at IS NULL", db.m("id", id));
        }
        audit("USER_STATUS_CHANGED", "USER", id);
        return Map.of("status", nextStatus);
    }

    @GetMapping("/problems")
    public List<Map<String, Object>> problems() {
        auth.requireAdmin();
        return db.list(
                "SELECT id,title,slug,difficulty,visibility FROM problems WHERE deleted_at IS NULL ORDER BY id DESC LIMIT 100",
                db.m());
    }

    @GetMapping("/comments")
    public List<Map<String, Object>> comments() {
        auth.requireAdmin();
        return db.list(
                "SELECT c.id,c.content,c.is_hidden,u.username,COALESCE(NULLIF(BTRIM(u.full_name), ''), u.username) AS full_name,p.title FROM comments c JOIN users u ON c.user_id=u.id JOIN problems p ON c.problem_id=p.id WHERE c.deleted_at IS NULL ORDER BY c.created_at DESC LIMIT 100",
                db.m());
    }

    @PatchMapping("/comments/{id}/hidden")
    public Map<String, Object> hide(@PathVariable long id, @RequestBody Map<String, Object> b) {
        auth.requireAdmin();
        boolean hidden = Boolean.TRUE.equals(b.get("hidden"));
        db.exec("UPDATE comments SET is_hidden=:h WHERE id=:id", db.m("h", hidden, "id", id));
        audit("COMMENT_MODERATED", "COMMENT", id);
        return Map.of("hidden", hidden);
    }

    @GetMapping("/audit-logs")
    public List<Map<String, Object>> logs() {
        auth.requireAdmin();
        return db.list("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100", db.m());
    }
}
