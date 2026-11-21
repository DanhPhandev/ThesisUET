package com.codeuet.auth.google;

import com.codeuet.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;

import java.util.Locale;

/** Server-side Google ID-token verifier. Never trust email sent by the browser. */
@Service
public class GoogleIdTokenVerifierService {
    private static final String GOOGLE_JWKS = "https://www.googleapis.com/oauth2/v3/certs";
    private final String clientId;
    private final NimbusJwtDecoder decoder;

    public GoogleIdTokenVerifierService(@Value("${app.google.client-id:}") String clientId) {
        this.clientId = clientId.trim();
        decoder = NimbusJwtDecoder.withJwkSetUri(GOOGLE_JWKS).build();
        OAuth2TokenValidator<Jwt> googleClaims = jwt -> {
            String iss = jwt.getIssuer() == null ? "" : jwt.getIssuer().toString();
            if (!("accounts.google.com".equals(iss) || "https://accounts.google.com".equals(iss)))
                return invalid("Google issuer không hợp lệ");
            if (jwt.getAudience() == null || !jwt.getAudience().contains(this.clientId))
                return invalid("Google audience không hợp lệ");
            String azp = jwt.getClaimAsString("azp");
            if (azp != null && !azp.equals(this.clientId))
                return invalid("Google authorized party không hợp lệ");
            if (!Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified")))
                return invalid("Gmail chưa được Google xác minh");
            String sub = jwt.getSubject();
            String email = jwt.getClaimAsString("email");
            if (sub == null || sub.isBlank() || email == null || email.isBlank())
                return invalid("Google token thiếu thông tin tài khoản");
            // Only Google-managed Gmail addresses can be auto-linked to existing accounts.
            // Google accounts with external email addresses are deliberately excluded.
            String normalized = email.trim().toLowerCase(Locale.ROOT);
            if (!(normalized.endsWith("@gmail.com") || normalized.endsWith("@googlemail.com")))
                return invalid("Chỉ hỗ trợ tài khoản Gmail");
            return OAuth2TokenValidatorResult.success();
        };
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefault(), googleClaims));
    }

    public GoogleIdentity verify(String credential) {
        if (clientId.isBlank())
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "GOOGLE_NOT_CONFIGURED",
                    "Máy chủ chưa cấu hình GOOGLE_CLIENT_ID");
        if (credential == null || credential.isBlank())
            throw new ApiException(HttpStatus.BAD_REQUEST, "GOOGLE_CREDENTIAL_REQUIRED", "Thiếu Google ID token");
        try {
            Jwt jwt = decoder.decode(credential);
            return new GoogleIdentity(jwt.getSubject(),
                    jwt.getClaimAsString("email").trim().toLowerCase(Locale.ROOT),
                    jwt.getClaimAsString("name"), jwt.getClaimAsString("picture"));
        } catch (JwtException | IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_GOOGLE_TOKEN",
                    "Xác thực Google không hợp lệ hoặc đã hết hạn");
        }
    }

    private static OAuth2TokenValidatorResult invalid(String message) {
        return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", message, null));
    }
}
