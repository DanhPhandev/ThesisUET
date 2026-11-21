package com.codeuet.submission;

import com.codeuet.common.*;
import java.util.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class JudgeWorker {
    private final Db db;
    private final Judge0Client client;
    private final ResultApplier result;
    private final TransactionTemplate tx;

    public JudgeWorker(Db db, Judge0Client client, ResultApplier result, PlatformTransactionManager tm) {
        this.db = db;
        this.client = client;
        this.result = result;
        this.tx = new TransactionTemplate(tm);
    }

    public Long acquire() {
        return tx.execute(status -> {
            List<Map<String, Object>> rows = db.list(
                    "SELECT id FROM submissions WHERE verdict='PENDING' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED",
                    db.m());
            if (rows.isEmpty())
                return null;
            long id = ((Number) rows.get(0).get("id")).longValue();
            db.exec("UPDATE submissions SET verdict='JUDGING' WHERE id=:id", db.m("id", id));
            return id;
        });
    }

    @Scheduled(fixedDelay = 1500)
    public void work() {
        Long id = acquire();
        if (id == null)
            return;
        try {
            var sub = db.one(
                    "SELECT s.*,l.judge0_id,p.time_limit_ms,p.memory_limit_mb FROM submissions s JOIN languages l ON l.id=s.language_id JOIN problems p ON p.id=s.problem_id WHERE s.id=:id",
                    db.m("id", id));
            var tests = db.list("SELECT * FROM test_cases WHERE problem_id=:p ORDER BY order_index",
                    db.m("p", sub.get("problem_id")));
            List<Map<String, Object>> results = new ArrayList<>();
            for (var t : tests) {
                var judged = client.judge(((Number) sub.get("judge0_id")).intValue(), (String) sub.get("source_code"),
                        (String) t.get("input"), (String) t.get("expected_output"),
                        ((Number) sub.get("time_limit_ms")).intValue(),
                        ((Number) sub.get("memory_limit_mb")).intValue());
                results.add(
                        db.m("verdict", Judge0Client.verdict(judged, ((Number) sub.get("memory_limit_mb")).intValue()),
                                "time_ms", Judge0Client.millis(judged), "memory_kb", Judge0Client.memory(judged),
                                "compile_output", judged.get("compile_output")));
            }
            result.apply(id, results);
        } catch (Exception ex) {
            result.failure(id, "Judge0 gặp lỗi: " + ex.getClass().getSimpleName());
        }
    }

    @Scheduled(fixedDelay = 120000, initialDelay = 120000)
    public void recover() {
        db.exec("UPDATE submissions SET verdict='PENDING' WHERE verdict='JUDGING' AND created_at<NOW()-interval '2 minutes'",
                db.m());
    }
}
