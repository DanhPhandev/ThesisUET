package com.codeuet.submission;

import com.codeuet.auth.AuthService;
import com.codeuet.common.ApiException;
import com.codeuet.common.Db;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SupportedLanguagesTest {
    @Mock Db db;
    @Mock AuthService auth;
    @Mock Judge0Client judge;
    SubmissionController controller;

    @BeforeEach
    void setup() {
        controller = new SubmissionController(db, auth, judge);
        lenient().when(db.m(any(Object[].class))).thenAnswer(invocation -> {
            Object[] pairs = invocation.getArgument(0);
            Map<String, Object> map = new HashMap<>();
            for (int i = 0; i < pairs.length; i += 2) map.put((String) pairs[i], pairs[i + 1]);
            return map;
        });
    }

    @Test
    void listShowsOnlyCppAndPython() {
        when(db.list(anyString(), anyMap())).thenReturn(List.of());
        controller.languages();
        ArgumentCaptor<String> query = ArgumentCaptor.forClass(String.class);
        verify(db).list(query.capture(), anyMap());
        assertThat(query.getValue()).contains("code IN ('cpp','python3')");
    }

    @Test
    void runRejectsJavaBeforeSendingAnythingToJudge0() {
        Map<String, Object> request = Map.of(
            "problemId", 1, "language", "java", "sourceCode", "public class Main {}"
        );
        assertThatThrownBy(() -> controller.run(request))
            .isInstanceOfSatisfying(ApiException.class, e -> {
                assertThat(e.status).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(e.getMessage()).contains("C++", "Python");
            });
        verifyNoInteractions(judge);
        verify(db, never()).one(anyString(), anyMap());
    }

    @Test
    void submitRejectsJavaBeforeInsertingASubmission() {
        when(auth.userId()).thenReturn(12L);
        SubmissionController.Submit request = new SubmissionController.Submit(1L, "java", "class Main {}", null);
        assertThatThrownBy(() -> controller.submit(request))
            .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.status).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(db, never()).insert(anyString(), anyMap());
    }
}
