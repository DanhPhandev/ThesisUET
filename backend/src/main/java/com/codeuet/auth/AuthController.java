package com.codeuet.auth;

import com.codeuet.common.*;
import com.codeuet.auth.google.*;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService auth;
    private final GoogleIdTokenVerifierService googleVerifier;
    private final GoogleUserLinkService googleUsers;
    private final boolean secure;

    AuthController(AuthService auth, GoogleIdTokenVerifierService googleVerifier,
                   GoogleUserLinkService googleUsers, @Value("${app.secure-cookie}") boolean secure) {
        this.auth = auth;
        this.googleVerifier = googleVerifier;
        this.googleUsers = googleUsers;
        this.secure = secure;
    }

    public record Register(@NotBlank String username, @Email String email, @NotBlank String password, String fullName) {
    }

    public record Login(@NotBlank String login, @NotBlank String password) {
    }

    @PostMapping("/register")
    ResponseEntity<?> register(@Valid @RequestBody Register r) {
        return ResponseEntity.status(201).body(auth.register(r.username(), r.email(), r.password(), r.fullName()));
    }

    private void cookie(HttpServletResponse response, String value, int age) {
        ResponseCookie c = ResponseCookie.from("refresh_token", value).httpOnly(true).secure(secure).sameSite("Strict")
                .path("/api/v1/auth").maxAge(age).build();
        response.addHeader(HttpHeaders.SET_COOKIE, c.toString());
    }

    private Map<String, Object> session(Map<String, Object> row, HttpServletResponse response) {
        cookie(response, auth.newRefresh(((Number) row.get("id")).longValue()), 604800);
        return Map.of("accessToken", auth.access(row), "user", auth.publicUser(row));
    }

    @PostMapping("/login")
    Map<String, Object> login(@Valid @RequestBody Login r, HttpServletResponse resp) {
        return session(auth.login(r.login(), r.password()), resp);
    }

    @PostMapping({"/google", "/google/login"})
    Map<String, Object> googleLogin(@Valid @RequestBody GoogleLoginRequest request, HttpServletResponse resp) {
        return session(googleUsers.findOrCreate(googleVerifier.verify(request.credential())), resp);
    }

    @PostMapping("/refresh")
    Map<String, Object> refresh(@CookieValue(name = "refresh_token", required = false) String token,
            HttpServletResponse resp) {
        return session(auth.rotate(token), resp);
    }

    @PostMapping("/logout")
    ResponseEntity<?> logout(@CookieValue(name = "refresh_token", required = false) String token,
            HttpServletResponse resp) {
        auth.revoke(token);
        cookie(resp, "", 0);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    Map<String, Object> me() {
        return auth.publicUser(auth.user());
    }

    // Does not expose existence of email; SMTP reset delivery is an integration
    // task.
    @PostMapping("/forgot-password")
    ResponseEntity<?> forgot(@RequestBody Map<String, Object> body) {
        return ResponseEntity.noContent().build();
    }
}
