package com.codeuet.auth.google;

/** Thông tin đã được xác thực từ Google ID token, không lấy từ body frontend. */
public record GoogleIdentity(String sub, String email, String name, String picture) {}
