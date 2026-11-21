package com.codeuet.config;

import com.codeuet.auth.AuthService;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

public class TokenFilter extends OncePerRequestFilter {
    private final AuthService auth;

    public TokenFilter(AuthService a) {
        auth = a;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String h = req.getHeader("Authorization");
        if (h != null && h.startsWith("Bearer "))
            try {
                var user = auth.verify(h.substring(7));
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null,
                        java.util.List.of(new SimpleGrantedAuthority("ROLE_" + user.get("role")))));
            } catch (Exception ignored) {
            }
        chain.doFilter(req, res);
    }
}
