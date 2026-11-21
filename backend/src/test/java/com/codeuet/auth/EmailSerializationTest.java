package com.codeuet.auth;

import com.codeuet.common.Db;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.postgresql.util.PGobject;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class EmailSerializationTest {
    @Test
    void publicSessionReturnsStringForPostgresCitextInsteadOfPgObject() throws Exception {
        PGobject email = new PGobject();
        email.setType("citext");
        email.setValue("admin@example.com");

        Map<String, Object> row = new HashMap<>();
        row.put("id", 1L);
        row.put("username", "admin");
        row.put("email", email);
        row.put("full_name", "Quản trị viên");
        row.put("role", "ADMIN");
        row.put("status", "ACTIVE");

        AuthService auth = new AuthService(mock(Db.class), mock(PasswordEncoder.class),
                new ObjectMapper(), "this-is-a-long-enough-example-jwt-secret");
        assertThat(auth.publicUser(row).get("email")).isEqualTo("admin@example.com");
    }
}
