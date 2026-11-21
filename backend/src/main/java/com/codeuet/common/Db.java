package com.codeuet.common;

import java.util.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class Db {
    public final NamedParameterJdbcTemplate jdbc;

    public Db(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> list(String sql, Map<String, ?> params) {
        return jdbc.queryForList(sql, params);
    }

    public Map<String, Object> one(String sql, Map<String, ?> params) {
        List<Map<String, Object>> a = list(sql, params);
        if (a.isEmpty())
            throw ApiException.notFound();
        return a.get(0);
    }

    public Map<String, Object> maybe(String sql, Map<String, ?> params) {
        List<Map<String, Object>> a = list(sql, params);
        return a.isEmpty() ? null : a.get(0);
    }

    public int exec(String sql, Map<String, ?> params) {
        return jdbc.update(sql, params);
    }

    public long insert(String sql, Map<String, ?> params) {
        return jdbc.queryForObject(sql, params, Long.class);
    }

    public Map<String, Object> m(Object... pairs) {
        Map<String, Object> m = new HashMap<>();
        for (int i = 0; i < pairs.length; i += 2)
            m.put((String) pairs[i], pairs[i + 1]);
        return m;
    }

    public long id(Map<String, Object> m) {
        return ((Number) m.get("id")).longValue();
    }

    public Map<String, Object> page(String sql, Map<String, Object> args, int page, int size) {
        int p = Math.max(0, page), s = Math.min(Math.max(1, size), 100);
        List<Map<String, Object>> rows = list(sql + " LIMIT :limit OFFSET :offset",
                add(args, "limit", s, "offset", p * s));
        int count = rows.size();
        return Map.of("content", rows, "page", p, "size", s, "totalElements", count, "totalPages", (count + s - 1) / s);
    }

    public Map<String, Object> add(Map<String, Object> m, Object... kv) {
        Map<String, Object> c = new HashMap<>(m);
        for (int i = 0; i < kv.length; i += 2)
            c.put((String) kv[i], kv[i + 1]);
        return c;
    }
}
