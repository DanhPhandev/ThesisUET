package com.codeuet.common;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.dao.DataIntegrityViolationException;

@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(ApiException.class)
    ResponseEntity<?> app(ApiException e) {
        return ResponseEntity.status(e.status).body(Map.of("status", e.status.value(), "code", e.code, "message",
                e.getMessage(), "errors", List.of(), "timestamp", Instant.now().toString()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> invalid(MethodArgumentNotValidException e) {
        return ResponseEntity.badRequest()
                .body(Map.of("status", 400, "code", "VALIDATION_FAILED", "message", "Dữ liệu không hợp lệ", "errors",
                        e.getBindingResult().getFieldErrors().stream()
                                .map(x -> Map.of("field", x.getField(), "message",
                                        x.getDefaultMessage() == null ? "invalid" : x.getDefaultMessage()))
                                .toList(),
                        "timestamp", Instant.now().toString()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<?> conflict(DataIntegrityViolationException e) {
        return ResponseEntity.status(409)
                .body(Map.of("status", 409, "code", "CONFLICT", "message", "Dữ liệu đã tồn tại hoặc đang được sử dụng",
                        "errors", List.of(), "timestamp", Instant.now().toString()));
    }
}
