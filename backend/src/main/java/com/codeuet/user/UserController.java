package com.codeuet.user;

import com.codeuet.common.*;
import com.codeuet.auth.AuthService;
import java.util.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.*;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {
    final Db db;
    final AuthService auth;
    final AvatarStorageService avatars;

    public UserController(Db db, AuthService auth, AvatarStorageService avatars) {
        this.db = db;
        this.auth = auth;
        this.avatars = avatars;
    }

    @GetMapping("/{username}")
    public Map<String, Object> profile(@PathVariable String username) {
        var u = db.one(
                "SELECT id,username,full_name,bio,school,avatar_url,created_at FROM users WHERE username=:u AND status='ACTIVE'",
                db.m("u", username));
        var r = new LinkedHashMap<>(u);
        r.put("stats", db.one(
                "SELECT COUNT(*) FILTER(WHERE s.is_solved) AS solved,COUNT(*) FILTER(WHERE s.is_solved AND p.difficulty='EASY') AS easy,COUNT(*) FILTER(WHERE s.is_solved AND p.difficulty='MEDIUM') AS medium,COUNT(*) FILTER(WHERE s.is_solved AND p.difficulty='HARD') AS hard FROM user_problem_status s JOIN problems p ON p.id=s.problem_id WHERE s.user_id=:id",
                db.m("id", u.get("id"))));
        r.put("rank",
                db.maybe("SELECT rank,points FROM v_global_leaderboard WHERE user_id=:id", db.m("id", u.get("id"))));
        return r;
    }

    /**
     * Update only the profile fields supplied by the owner.
     * Missing fields are preserved; an empty bio/school clears that field.
     * Using the authenticated user id prevents editing another user's profile.
     */
    @PatchMapping("/me")
    public Map<String, Object> editProfile(@RequestBody Map<String, Object> input) {
        if (input == null || input.isEmpty()) throw ApiException.bad("Không có thông tin hồ sơ để cập nhật");

        List<String> updates = new ArrayList<>();
        Map<String, Object> params = new HashMap<>();
        if (input.containsKey("fullName")) {
            updates.add("full_name=:name");
            params.put("name", validatedName(input.get("fullName")));
        }
        if (input.containsKey("bio")) {
            updates.add("bio=:bio");
            params.put("bio", optionalString(input.get("bio"), 500, "Giới thiệu"));
        }
        if (input.containsKey("school")) {
            updates.add("school=:school");
            params.put("school", optionalString(input.get("school"), 150, "Trường học"));
        }
        if (updates.isEmpty()) throw ApiException.bad("Không có trường hồ sơ hợp lệ để cập nhật");

        updates.add("updated_at=NOW()");
        params.put("id", auth.userId());
        db.exec("UPDATE users SET " + String.join(",", updates) + " WHERE id=:id", params);
        return auth.publicUser(auth.user());
    }

    /** Existing settings endpoint, retained for backward compatibility. */
    @PutMapping("/me")
    public Map<String, Object> edit(@RequestBody Map<String, Object> b) {
        String name = validatedName(b.get("fullName"));
        String bio = optionalString(b.get("bio"), 500, "Giới thiệu");
        String school = optionalString(b.get("school"), 150, "Trường học");
        db.exec("UPDATE users SET full_name=:n,bio=:b,school=:s,updated_at=NOW() WHERE id=:id",
                db.m("n", name, "b", bio, "s", school, "id", auth.userId()));
        return auth.publicUser(auth.user());
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> uploadAvatar(@RequestParam("file") MultipartFile file) {
        // Authorization is based on the JWT user ID, never on a supplied username.
        Map<String, Object> user = auth.user();
        String oldUrl = (String) user.get("avatar_url");
        String url = avatars.save(file);
        try {
            db.exec("UPDATE users SET avatar_url=:url,updated_at=NOW() WHERE id=:id",
                    db.m("url", url, "id", user.get("id")));
        } catch (RuntimeException e) {
            avatars.deletePrevious(url);
            throw e;
        }
        avatars.deletePrevious(oldUrl);
        return auth.publicUser(auth.user());
    }

    @DeleteMapping("/me/avatar")
    public Map<String, Object> removeAvatar() {
        Map<String, Object> user = auth.user();
        String oldUrl = (String) user.get("avatar_url");
        db.exec("UPDATE users SET avatar_url=NULL,updated_at=NOW() WHERE id=:id",
                db.m("id", user.get("id")));
        avatars.deletePrevious(oldUrl);
        return auth.publicUser(auth.user());
    }

    @GetMapping("/avatars/{filename:.+}")
    public ResponseEntity<byte[]> avatar(@PathVariable String filename) {
        var avatar = avatars.load(filename);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(avatar.contentType()))
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.noCache())
                .body(avatar.bytes());
    }

    private static String validatedName(Object value) {
        if (!(value instanceof String str) || str.isBlank() || str.strip().length() > 100) {
            throw ApiException.bad("Họ tên phải có từ 1 đến 100 ký tự");
        }
        return str.strip();
    }

    private static String optionalString(Object value, int max, String field) {
        if (value == null) return null;
        if (!(value instanceof String str) || str.length() > max) {
            throw ApiException.bad(field + " không hợp lệ hoặc quá dài");
        }
        return str.isBlank() ? null : str.strip();
    }

    @PutMapping("/me/password")
    public ResponseEntity<?> password(@RequestBody Map<String, String> b) {
        var u = auth.user();
        if (!auth.checkPassword(b.getOrDefault("currentPassword", ""), (String) u.get("password_hash")))
            throw ApiException.bad("Mật khẩu hiện tại không đúng");
        db.exec("UPDATE users SET password_hash=:pwd WHERE id=:id",
                db.m("pwd", auth.encode(b.get("newPassword")), "id", auth.userId()));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{username}/solved")
    public List<Map<String, Object>> solved(@PathVariable String username) {
        return db.list(
                "SELECT p.slug,p.title,p.difficulty,s.first_solved_at FROM user_problem_status s JOIN users u ON u.id=s.user_id JOIN problems p ON p.id=s.problem_id WHERE u.username=:u AND s.is_solved ORDER BY s.first_solved_at DESC",
                db.m("u", username));
    }

    @GetMapping("/{username}/activity")
    public List<Map<String, Object>> activity(@PathVariable String username) {
        return db.list(
                "SELECT DATE(s.created_at) AS day,COUNT(*) AS count FROM submissions s JOIN users u ON u.id=s.user_id WHERE u.username=:u AND s.created_at>NOW()-interval '365 days' GROUP BY DATE(s.created_at) ORDER BY day",
                db.m("u", username));
    }

    @GetMapping("/{username}/achievements")
    public List<Map<String, Object>> badges(@PathVariable String username) {
        return db.list(
                "SELECT a.name,a.description,a.code,ua.earned_at FROM user_achievements ua JOIN achievements a ON a.id=ua.achievement_id JOIN users u ON u.id=ua.user_id WHERE u.username=:u",
                db.m("u", username));
    }
}
