package com.codeuet.leaderboard;

import com.codeuet.common.Db;
import com.codeuet.auth.AuthService;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/leaderboard")
public class LeaderboardController {
    final Db db;
    final AuthService auth;

    public LeaderboardController(Db db, AuthService a) {
        this.db = db;
        auth = a;
    }

    @GetMapping
    public List<Map<String, Object>> global(@RequestParam(defaultValue = "0") int page) {
        return db.list(
                "SELECT v.rank,v.user_id,v.username,NULLIF(BTRIM(u.full_name), '') AS full_name,v.avatar_url,v.solved,v.points FROM v_global_leaderboard v JOIN users u ON u.id=v.user_id ORDER BY v.rank LIMIT 50 OFFSET :off",
                db.m("off", Math.max(0, page) * 50));
    }

    @GetMapping("/me")
    public Map<String, Object> me() {
        return db.one("SELECT v.rank,v.user_id,v.username,NULLIF(BTRIM(u.full_name), '') AS full_name,v.solved,v.points FROM v_global_leaderboard v JOIN users u ON u.id=v.user_id WHERE v.user_id=:id",
                db.m("id", auth.userId()));
    }
}
