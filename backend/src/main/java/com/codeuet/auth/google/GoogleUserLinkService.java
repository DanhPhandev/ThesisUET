package com.codeuet.auth.google;

import com.codeuet.common.ApiException;
import com.codeuet.common.Db;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Match an existing verified Gmail or create one USER. Preserve the existing user's ID and role. */
@Service
public class GoogleUserLinkService {
    private final Db db;
    private final PasswordEncoder passwords;

    public GoogleUserLinkService(Db db, PasswordEncoder passwords) {
        this.db = db;
        this.passwords = passwords;
    }

    @Transactional
    public Map<String, Object> findOrCreate(GoogleIdentity identity) {
        Map<String, Object> bySubject = db.maybe("SELECT * FROM users WHERE google_sub=:sub",
                db.m("sub", identity.sub()));
        if (bySubject != null) {
            if (!identity.email().equalsIgnoreCase(String.valueOf(bySubject.get("email"))))
                throw conflict(); // Never silently change the canonical email.
            return active(bySubject);
        }

        Map<String, Object> byEmail = db.maybe("SELECT * FROM users WHERE email=:email",
                db.m("email", identity.email()));
        if (byEmail != null)
            return linkExisting(byEmail, identity);

        String username = "g_" + UUID.randomUUID().toString().replace("-", "").substring(0, 24);
        String randomPassword = UUID.randomUUID().toString() + UUID.randomUUID();
        List<Map<String, Object>> inserted = db.list("""
                INSERT INTO users(username,email,password_hash,full_name,google_sub,email_verified)
                VALUES (:username,:email,:password,:name,:sub,TRUE)
                ON CONFLICT DO NOTHING RETURNING *
                """, db.m("username", username, "email", identity.email(),
                        "password", passwords.encode(randomPassword),
                        "name", cleanName(identity.name()), "sub", identity.sub()));
        if (!inserted.isEmpty())
            return active(inserted.get(0));

        // A simultaneous first sign-in may already have inserted the account.
        Map<String, Object> concurrent = db.maybe("SELECT * FROM users WHERE google_sub=:sub",
                db.m("sub", identity.sub()));
        if (concurrent != null) {
            if (!identity.email().equalsIgnoreCase(String.valueOf(concurrent.get("email"))))
                throw conflict();
            return active(concurrent);
        }
        concurrent = db.maybe("SELECT * FROM users WHERE email=:email", db.m("email", identity.email()));
        if (concurrent != null)
            return linkExisting(concurrent, identity);
        throw conflict(); // Extremely unlikely username collision; never attach wrong account.
    }

    private String cleanName(String name) {
        if (name == null || name.isBlank()) return null;
        String trimmed = name.trim();
        return trimmed.length() > 100 ? trimmed.substring(0, 100) : trimmed;
    }

    private Map<String, Object> linkExisting(Map<String, Object> user, GoogleIdentity identity) {
        active(user);
        String boundSub = (String) user.get("google_sub");
        if (boundSub != null && !boundSub.equals(identity.sub()))
            throw conflict();
        // Atomic conditional update prevents another Google identity replacing an existing binding.
        int updated = db.exec("""
                UPDATE users SET google_sub=:sub, email_verified=TRUE, updated_at=NOW()
                WHERE id=:id AND (google_sub IS NULL OR google_sub=:sub)
                """, db.m("sub", identity.sub(), "id", user.get("id")));
        if (updated != 1)
            throw conflict();
        return active(db.one("SELECT * FROM users WHERE id=:id", db.m("id", user.get("id"))));
    }

    private Map<String, Object> active(Map<String, Object> user) {
        if (!"ACTIVE".equals(user.get("status")))
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_LOCKED", "Tài khoản đã bị khóa");
        return user;
    }

    private ApiException conflict() {
        return new ApiException(HttpStatus.CONFLICT, "GOOGLE_LINK_CONFLICT",
                "Email đã liên kết với tài khoản Google khác; không thể tự động đăng nhập");
    }
}
