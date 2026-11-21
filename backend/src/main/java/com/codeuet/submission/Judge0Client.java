package com.codeuet.submission;

import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.ResourceAccessException;

@Component
public class Judge0Client {
    private final RestClient client;

    public Judge0Client(@Value("${app.judge0-url}") String url) {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(3000);
        f.setReadTimeout(10000);
        client = RestClient.builder().baseUrl(url).requestFactory(f).build();
    }

    public Map<String, Object> judge(int languageId, String source, String input, String expected, int timeMs,
            int memoryMb) {
        Map<String, Object> req = new HashMap<>();
        req.put("language_id", languageId);
        req.put("source_code", source);
        req.put("stdin", input);
        if (expected != null)
            req.put("expected_output", expected);
        req.put("cpu_time_limit", Math.max(.1, timeMs / 1000.0));
        req.put("memory_limit", memoryMb * 1024);
        @SuppressWarnings("unchecked")
        Map<String, Object> created = client.post().uri("/submissions?base64_encoded=false")
                .contentType(MediaType.APPLICATION_JSON).body(req).retrieve().body(Map.class);
        if (created == null || created.get("token") == null)
            throw new IllegalStateException("Judge0 không tạo token");
        String token = String.valueOf(created.get("token"));
        long deadline = System.currentTimeMillis() + 60000;
        while (System.currentTimeMillis() < deadline) {
            @SuppressWarnings("unchecked")
            Map<String, Object> r = client.get().uri("/submissions/{token}?base64_encoded=false", token).retrieve()
                    .body(Map.class);
            if (r == null)
                throw new IllegalStateException("Judge0 trả kết quả rỗng");
            @SuppressWarnings("unchecked")
            Map<String, Object> st = (Map<String, Object>) r.get("status");
            int code = ((Number) st.get("id")).intValue();
            if (code > 2)
                return r;
            try {
                Thread.sleep(500);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Judge interrupted", ie);
            }
        }
        throw new IllegalStateException("Judge0 timeout");
    }

    public static String verdict(Map<String, Object> r, int memLimit) {
        @SuppressWarnings("unchecked")
        Map<String, Object> st = (Map<String, Object>) r.get("status");
        int v = ((Number) st.get("id")).intValue();
        if (v == 3)
            return "AC";
        if (v == 4)
            return "WA";
        if (v == 5)
            return "TLE";
        if (v == 6)
            return "CE";
        if (v >= 7 && v <= 12) {
            Object mem = r.get("memory");
            return mem instanceof Number && ((Number) mem).intValue() >= memLimit * 1024 ? "MLE" : "RE";
        }
        return "SE";
    }

    public static int memory(Map<String, Object> r) {
        Object n = r.get("memory");
        return n instanceof Number ? ((Number) n).intValue() : 0;
    }

    public static int millis(Map<String, Object> r) {
        try {
            return (int) Math.round(Double.parseDouble(String.valueOf(r.getOrDefault("time", "0"))) * 1000);
        } catch (Exception e) {
            return 0;
        }
    }
}
