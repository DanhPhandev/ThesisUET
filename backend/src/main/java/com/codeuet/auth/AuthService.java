package com.codeuet.auth;

import com.codeuet.common.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import javax.crypto.*;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.context.SecurityContextHolder;

@Service
public class AuthService {
    private final Db db;
    private final PasswordEncoder passwords;
    private final ObjectMapper mapper;
    private final String secret;
    private final SecureRandom random = new SecureRandom();

    public AuthService(Db db, PasswordEncoder passwords, ObjectMapper mapper,
            @Value("${app.jwt-secret}") String secret) {
        this.db = db;
        this.passwords = passwords;
        this.mapper = mapper;
        this.secret = secret;
        if (secret.length() < 32)
            throw new IllegalArgumentException("JWT_SECRET requires at least 32 characters");
    }

    public Map<String, Object> publicUser(Map<String, Object> row) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", row.get("id"));
        result.put("username", row.get("username"));
        // PostgreSQL CITEXT may be returned by JDBC as PGobject; JSON must contain a string.
        result.put("email", row.get("email") == null ? "" : row.get("email").toString());
        result.put("role", row.get("role"));
        result.put("status", row.get("status"));
        result.put("fullName", row.get("full_name") == null ? "" : row.get("full_name"));
        result.put("avatarUrl", row.get("avatar_url"));
        result.put("bio", row.get("bio"));
        result.put("school", row.get("school"));
        return result;
    }

    public Map<String, Object> requireUser() {
        var a = SecurityContextHolder.getContext().getAuthentication();
        if (a == null || !(a.getPrincipal() instanceof Map<?, ?>))
            throw new ApiException(HttpStatus.UNAUTHORIZED, "TOKEN_INVALID", "Vui lòng đăng nhập");
        @SuppressWarnings("unchecked")
        Map<String, Object> m = (Map<String, Object>) a.getPrincipal();
        return m;
    }

    public Map<String, Object> user() {
        Map<String, Object> m = requireUser();
        return db.one("SELECT * FROM users WHERE id=:id AND status='ACTIVE'", db.m("id", m.get("id")));
    }

    public long userId() {
        return ((Number) requireUser().get("id")).longValue();
    }

    public boolean isSetter() {
        String r = (String) requireUser().get("role");
        return r.equals("SETTER") || r.equals("ADMIN");
    }

    public boolean isAdmin() {
        return requireUser().get("role").equals("ADMIN");
    }

    public void requireSetter() {
        if (!isSetter())
            throw ApiException.forbidden();
    }

    public void requireAdmin() {
        if (!isAdmin())
            throw ApiException.forbidden();
    }

    public void ownership(long owner) {
        if (!isAdmin() && userId() != owner)
            throw ApiException.forbidden();
    }

    public void passwordPolicy(String p) {
        if (p == null || p.length() < 8 || !p.matches("(?s).*[A-Za-z].*") || !p.matches("(?s).*\\d.*"))
            throw ApiException.bad("Mật khẩu tối thiểu 8 ký tự, có chữ và số");
    }

    public Map<String, Object> register(String username, String email, String password, String name) {
        if (username == null || !username.matches("[a-zA-Z0-9_]{3,32}"))
            throw ApiException.bad("Tên tài khoản từ 3–32 ký tự chữ, số hoặc _");
        if (email == null || !email.matches("^[^@ ]+@[^@ ]+\\.[^@ ]+$"))
            throw ApiException.bad("Email không hợp lệ");
        passwordPolicy(password);
        long id = db.insert(
                "INSERT INTO users(username,email,password_hash,full_name) VALUES (:u,:e,:p,:n) RETURNING id",
                db.m("u", username, "e", email, "p", passwords.encode(password), "n", name));
        return publicUser(db.one("SELECT * FROM users WHERE id=:id", db.m("id", id)));
    }

    public Map<String, Object> login(String login, String pass) {
        Map<String, Object> row = db.maybe("SELECT * FROM users WHERE username=:login OR email=:login",
                db.m("login", login));
        if (row == null || !passwords.matches(pass, (String) row.get("password_hash")))
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Sai tên đăng nhập hoặc mật khẩu");
        if (!"ACTIVE".equals(row.get("status")))
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_LOCKED", "Tài khoản đã bị khóa");
        return row;
    }

    private String b64(byte[] data) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }

    private byte[] hmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public String access(Map<String, Object> row) {
        try {
            String head = b64("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
            String body = b64(mapper
                    .writeValueAsBytes(Map.of("sub", String.valueOf(row.get("id")), "username", row.get("username"),
                            "role", row.get("role"), "exp", Instant.now().plusSeconds(900).getEpochSecond())));
            String msg = head + "." + body;
            return msg + "." + b64(hmac(msg));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public Map<String, Object> verify(String token) throws Exception {
        String[] p = token.split("\\.");
        if (p.length != 3)
            throw new SecurityException("JWT");
        if (!MessageDigest.isEqual(hmac(p[0] + "." + p[1]), Base64.getUrlDecoder().decode(p[2])))
            throw new SecurityException("JWT signature");
        @SuppressWarnings("unchecked")
        Map<String, Object> claims = mapper.readValue(Base64.getUrlDecoder().decode(p[1]), Map.class);
        if (!"HS256".equals(mapper.readTree(Base64.getUrlDecoder().decode(p[0])).path("alg").asText())
                || Long.parseLong(claims.get("exp").toString()) < Instant.now().getEpochSecond())
            throw new SecurityException("Expired");
        Map<String, Object> user = db.one("SELECT * FROM users WHERE id=:id AND status='ACTIVE'",
                db.m("id", Long.parseLong((String) claims.get("sub"))));
        return db.m("id", user.get("id"), "username", user.get("username"), "role", user.get("role"));
    }

    public String newRefresh(long userId) {
        byte[] b = new byte[64];
        random.nextBytes(b);
        String raw = b64(b);
        db.exec("INSERT INTO refresh_tokens(user_id,token_hash,expires_at) VALUES (:u,:h,NOW()+interval '7 days')",
                db.m("u", userId, "h", hash(raw)));
        return raw;
    }

    public String hash(String input) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public Map<String, Object> rotate(String raw) {
        if (raw == null)
            throw new ApiException(HttpStatus.UNAUTHORIZED, "TOKEN_INVALID", "Không có refresh token");
        Map<String, Object> row = db.maybe(
                "SELECT * FROM refresh_tokens WHERE token_hash=:h AND revoked_at IS NULL AND expires_at>NOW()",
                db.m("h", hash(raw)));
        if (row == null)
            throw new ApiException(HttpStatus.UNAUTHORIZED, "TOKEN_EXPIRED", "Phiên đăng nhập đã hết hạn");
        if (db.exec("UPDATE refresh_tokens SET revoked_at=NOW() WHERE id=:id AND revoked_at IS NULL",
                db.m("id", row.get("id"))) == 0)
            throw new ApiException(HttpStatus.UNAUTHORIZED, "TOKEN_EXPIRED", "Phiên đăng nhập đã được làm mới");
        return db.one("SELECT * FROM users WHERE id=:id AND status='ACTIVE'", db.m("id", row.get("user_id")));
    }

    public void revoke(String raw) {
        if (raw != null)
            db.exec("UPDATE refresh_tokens SET revoked_at=NOW() WHERE token_hash=:h", db.m("h", hash(raw)));
    }

    public boolean checkPassword(String plain, String hash) {
        return passwords.matches(plain, hash);
    }

    public String encode(String plain) {
        passwordPolicy(plain);
        return passwords.encode(plain);
    }
}
