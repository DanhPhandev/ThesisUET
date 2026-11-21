package com.codeuet.auth.google;

import jakarta.validation.constraints.NotBlank;

/** Google Identity Services trả về ID token trong thuộc tính credential. */
public record GoogleLoginRequest(@NotBlank String credential) {}
