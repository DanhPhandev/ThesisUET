package com.codeuet.leaderboard;

import com.codeuet.auth.AuthService;
import com.codeuet.common.Db;
import com.codeuet.contest.ContestController;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaderboardFullNameTest {
    @Mock Db db;
    @Mock AuthService auth;

    @BeforeEach
    void setup() {
        lenient().when(db.m(any(Object[].class))).thenReturn(Map.of());
        lenient().when(db.list(anyString(), anyMap())).thenReturn(List.of());
    }

    @Test
    void globalRankingSelectsActualFullNameNotUsernameFallback() {
        new LeaderboardController(db, auth).global(0);
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(db).list(sql.capture(), anyMap());
        assertThat(sql.getValue()).contains("NULLIF(BTRIM(u.full_name), '') AS full_name")
            .contains("v.username")
            .doesNotContain("u.username) AS full_name");
    }

    @Test
    void contestRankingSelectsActualFullNameNotUsernameFallback() {
        new ContestController(db, auth).standings(1L);
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(db).list(sql.capture(), anyMap());
        assertThat(sql.getValue()).contains("NULLIF(BTRIM(u.full_name), '') AS full_name")
            .doesNotContain("u.username) AS full_name");
    }
}
