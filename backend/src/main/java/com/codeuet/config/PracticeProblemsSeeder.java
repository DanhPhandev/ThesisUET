package com.codeuet.config;

import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Imports optional CodeUET practice problems AFTER BootstrapData creates an admin.
 * The PostgreSQL DO block is safe to re-run: only brand-new slugs are populated.
 */
@Component
@Order(2)
public class PracticeProblemsSeeder implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(PracticeProblemsSeeder.class);
    private final JdbcTemplate jdbc;
    private final boolean enabled;

    public PracticeProblemsSeeder(JdbcTemplate jdbc,
            @Value("${app.seed-practice-problems:true}") boolean enabled) {
        this.jdbc = jdbc;
        this.enabled = enabled;
    }

    @Override
    public void run(String... args) throws Exception {
        if (!enabled) {
            log.info("CodeUET practice seeding is disabled");
            return;
        }
        ClassPathResource script = new ClassPathResource("db/seed/seed_10_practice_problems.sql");
        String sql;
        try (var in = script.getInputStream()) {
            sql = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
        // A single PostgreSQL DO block; do not split on semicolons inside PL/pgSQL.
        jdbc.execute(sql);
        log.info("CodeUET practice seed checked (10 unique problems; existing slugs unchanged)");
    }
}
