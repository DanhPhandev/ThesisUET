package com.codeuet.submission;

import com.codeuet.common.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class ResultApplier {
    private final Db db;

    public ResultApplier(Db db) {
        this.db = db;
    }

    @Transactional
    public void apply(long id, List<Map<String, Object>> results) {
        Map<String, Object> s = db.one("SELECT * FROM submissions WHERE id=:id FOR UPDATE", db.m("id", id));
        if (!"JUDGING".equals(s.get("verdict")))
            return;
        List<Map<String, Object>> tests = db.list("SELECT * FROM test_cases WHERE problem_id=:p ORDER BY order_index",
                db.m("p", s.get("problem_id")));
        int totalWeight = 0, passedWeight = 0, passed = 0, maxTime = 0, maxMem = 0;
        String verdict = "AC";
        String compile = "";
        for (int i = 0; i < tests.size(); i++) {
            Map<String, Object> t = tests.get(i), r = results.get(i);
            String v = (String) r.get("verdict");
            int weight = ((Number) t.get("weight")).intValue();
            totalWeight += weight;
            if (v.equals("AC")) {
                passedWeight += weight;
                passed++;
            } else if (verdict.equals("AC"))
                verdict = v;
            maxTime = Math.max(maxTime, ((Number) r.get("time_ms")).intValue());
            maxMem = Math.max(maxMem, ((Number) r.get("memory_kb")).intValue());
            if (r.get("compile_output") != null)
                compile = String.valueOf(r.get("compile_output"));
            db.exec("INSERT INTO submission_test_results(submission_id,test_case_id,verdict,time_ms,memory_kb) VALUES (:s,:t,:v,:tm,:mem) ON CONFLICT(submission_id,test_case_id) DO UPDATE SET verdict=:v,time_ms=:tm,memory_kb=:mem",
                    db.m("s", id, "t", t.get("id"), "v", v, "tm", r.get("time_ms"), "mem", r.get("memory_kb")));
        }
        double score = totalWeight == 0 ? 0 : Math.round(10000.0 * passedWeight / totalWeight) / 100.0;
        db.exec("UPDATE submissions SET verdict=:v,score=:score,passed_tests=:passed,total_tests=:total,max_time_ms=:time,max_memory_kb=:memory,compile_output=:compile,judged_at=NOW() WHERE id=:id",
                db.m("v", verdict, "score", score, "passed", passed, "total", tests.size(), "time", maxTime, "memory",
                        maxMem, "compile", compile, "id", id));
        db.exec("UPDATE problems SET submission_count=submission_count+1,accepted_count=accepted_count+CASE WHEN :ac THEN 1 ELSE 0 END WHERE id=:p",
                db.m("ac", verdict.equals("AC"), "p", s.get("problem_id")));
        db.exec("INSERT INTO user_problem_status(user_id,problem_id,is_solved,attempts,first_solved_at) VALUES (:u,:p,:ac,1,CASE WHEN :ac THEN NOW() ELSE NULL END) ON CONFLICT(user_id,problem_id) DO UPDATE SET attempts=user_problem_status.attempts+1,is_solved=user_problem_status.is_solved OR EXCLUDED.is_solved,first_solved_at=COALESCE(user_problem_status.first_solved_at,EXCLUDED.first_solved_at)",
                db.m("u", s.get("user_id"), "p", s.get("problem_id"), "ac", verdict.equals("AC")));
        if (s.get("contest_id") != null) {
            var cp = db.one("SELECT points FROM contest_problems WHERE contest_id=:c AND problem_id=:p",
                    db.m("c", s.get("contest_id"), "p", s.get("problem_id")));
            double contestScore = score * ((Number) cp.get("points")).doubleValue() / 100.0;
            db.exec("INSERT INTO contest_problem_results(contest_id,user_id,problem_id,attempts,best_score,is_solved,solved_at,last_submit_at) VALUES (:c,:u,:p,CASE WHEN :wrong THEN 1 ELSE 0 END,:score,:ac,CASE WHEN :ac THEN NOW() ELSE NULL END,NOW()) ON CONFLICT(contest_id,user_id,problem_id) DO UPDATE SET attempts=contest_problem_results.attempts+CASE WHEN NOT contest_problem_results.is_solved AND :wrong THEN 1 ELSE 0 END,best_score=GREATEST(contest_problem_results.best_score,:score),is_solved=contest_problem_results.is_solved OR :ac,solved_at=CASE WHEN contest_problem_results.is_solved THEN contest_problem_results.solved_at WHEN :ac THEN NOW() ELSE NULL END,last_submit_at=NOW()",
                    db.m("c", s.get("contest_id"), "u", s.get("user_id"), "p", s.get("problem_id"), "wrong",
                            !verdict.equals("AC") && !verdict.equals("CE"), "score", contestScore, "ac",
                            verdict.equals("AC")));
        }
        if (verdict.equals("AC")) {
            db.exec("INSERT INTO user_achievements(user_id,achievement_id) SELECT :uid,id FROM achievements WHERE code='FIRST_AC' ON CONFLICT DO NOTHING",
                    db.m("uid", s.get("user_id")));
        }
    }

    @Transactional
    public void failure(long id, String reason) {
        db.exec("UPDATE submissions SET verdict='SE',compile_output=:msg,judged_at=NOW() WHERE id=:id AND verdict='JUDGING'",
                db.m("id", id, "msg", reason));
    }
}
