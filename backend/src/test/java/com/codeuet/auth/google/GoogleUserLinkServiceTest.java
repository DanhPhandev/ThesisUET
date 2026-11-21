package com.codeuet.auth.google;

import com.codeuet.common.ApiException;
import com.codeuet.common.Db;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class GoogleUserLinkServiceTest {
    private Db db;
    private PasswordEncoder passwords;
    private GoogleUserLinkService service;
    private final GoogleIdentity identity =
            new GoogleIdentity("google-sub-123", "alice@gmail.com", "Alice", null);

    @BeforeEach
    void setUp() {
        db = mock(Db.class);
        passwords = mock(PasswordEncoder.class);
        service = new GoogleUserLinkService(db, passwords);
        when(db.m(any(Object[].class))).thenAnswer(invocation -> {
            Object[] params = invocation.getArgument(0);
            Map<String, Object> values = new HashMap<>();
            for (int i = 0; i < params.length; i += 2)
                values.put((String) params[i], params[i + 1]);
            return values;
        });
    }

    private Map<String, Object> user(String sub, String role, String status) {
        Map<String, Object> row = new HashMap<>();
        row.put("id", 42L);
        row.put("email", "alice@gmail.com");
        row.put("username", "alice");
        row.put("role", role);
        row.put("status", status);
        row.put("google_sub", sub);
        return row;
    }

    @Test
    void existingGmailKeepsSameUserAndRole() {
        Map<String, Object> local = user(null, "ADMIN", "ACTIVE");
        Map<String, Object> linked = user("google-sub-123", "ADMIN", "ACTIVE");
        when(db.maybe(contains("google_sub=:sub"), anyMap())).thenReturn(null);
        when(db.maybe(contains("email=:email"), anyMap())).thenReturn(local);
        when(db.exec(contains("UPDATE users SET google_sub"), anyMap())).thenReturn(1);
        when(db.one(contains("WHERE id=:id"), anyMap())).thenReturn(linked);

        Map<String, Object> result = service.findOrCreate(identity);
        assertEquals(42L, result.get("id"));
        assertEquals("ADMIN", result.get("role"));
        verify(db, never()).list(contains("INSERT INTO users"), anyMap());
    }

    @Test
    void newGmailCreatesOnlyUserRoleAndRandomPasswordHash() {
        when(db.maybe(anyString(), anyMap())).thenReturn(null);
        when(passwords.encode(anyString())).thenReturn("bcrypt-random-placeholder");
        Map<String, Object> newUser = user("google-sub-123", "USER", "ACTIVE");
        when(db.list(contains("INSERT INTO users"), anyMap())).thenReturn(List.of(newUser));

        assertEquals("USER", service.findOrCreate(identity).get("role"));
        verify(db).list(contains("ON CONFLICT DO NOTHING"), argThat(args ->
                identity.email().equals(args.get("email")) &&
                identity.sub().equals(args.get("sub")) &&
                "bcrypt-random-placeholder".equals(args.get("password"))));
    }

    @Test
    void lockedAccountCannotSignIn() {
        when(db.maybe(contains("google_sub=:sub"), anyMap())).thenReturn(null);
        when(db.maybe(contains("email=:email"), anyMap())).thenReturn(user(null, "USER", "LOCKED"));
        assertThrows(ApiException.class, () -> service.findOrCreate(identity));
        verify(db, never()).exec(anyString(), anyMap());
    }

    @Test
    void differentGoogleSubCannotReplaceExistingLink() {
        when(db.maybe(contains("google_sub=:sub"), anyMap())).thenReturn(null);
        when(db.maybe(contains("email=:email"), anyMap()))
                .thenReturn(user("another-google-sub", "USER", "ACTIVE"));
        assertThrows(ApiException.class, () -> service.findOrCreate(identity));
        verify(db, never()).exec(anyString(), anyMap());
    }

    @Test
    void returningGoogleSubjectReusesLinkedUserWithoutUpdating() {
        Map<String, Object> linked = user("google-sub-123", "SETTER", "ACTIVE");
        when(db.maybe(contains("google_sub=:sub"), anyMap())).thenReturn(linked);
        assertEquals(42L, service.findOrCreate(identity).get("id"));
        assertEquals("SETTER", service.findOrCreate(identity).get("role"));
        verify(db, never()).exec(anyString(), anyMap());
    }
}
