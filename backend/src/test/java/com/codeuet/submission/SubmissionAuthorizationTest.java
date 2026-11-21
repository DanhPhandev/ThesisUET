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

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubmissionAuthorizationTest {
    @Mock Db db;
    @Mock AuthService auth;
    @Mock Judge0Client judge;

    SubmissionController controller;

    @BeforeEach
    void setup() {
        controller = new SubmissionController(db, auth, judge);
        // Db.m is a pure mapper helper, so use its real implementation on the mock.
        lenient().when(db.m(any(Object[].class))).thenAnswer(call -> {
            Object[] pairs = call.getArgument(0);
            java.util.Map<String, Object> result = new java.util.HashMap<>();
            for (int i = 0; i < pairs.length; i += 2)
                result.put((String) pairs[i], pairs[i + 1]);
            return result;
        });
    }

    @Test
    void normalUserGetsOnlyOwnHistoryEvenWhenUserFilterTargetsSomeoneElse() {
        when(auth.userId()).thenReturn(10L);
        when(auth.isAdmin()).thenReturn(false);
        when(db.list(anyString(), anyMap())).thenReturn(List.of());
        when(db.one(anyString(), anyMap())).thenReturn(Map.of("n", 0L));

        controller.submissions("another_user", null, null, null, 0, 20);

        ArgumentCaptor<String> query = ArgumentCaptor.forClass(String.class);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(db).list(query.capture(), params.capture());
        assertThat(query.getValue()).contains("s.user_id=:viewer").doesNotContain("u.username=:u");
        assertThat(params.getValue()).containsEntry("viewer", 10L);
        verify(db).one(argThat(sql -> sql.contains("s.user_id=:viewer")), anyMap());
    }

    @Test
    void adminCanAccessAllSubmissionsAndFilterByUsername() {
        when(auth.userId()).thenReturn(1L);
        when(auth.isAdmin()).thenReturn(true);
        when(db.list(anyString(), anyMap())).thenReturn(List.of());
        when(db.one(anyString(), anyMap())).thenReturn(Map.of("n", 0L));

        controller.submissions("some_user", null, null, null, 0, 20);
        verify(db).list(argThat(sql -> sql.contains("u.username=:u") && !sql.contains("s.user_id=:viewer")), anyMap());
    }

    @Test
    void otherUsersSubmissionIsForbiddenAndTestResultsAreNotFetched() {
        when(auth.userId()).thenReturn(10L);
        when(auth.isAdmin()).thenReturn(false);
        when(db.one(anyString(), anyMap())).thenReturn(Map.of("user_id", 20L, "source_code", "private"));

        assertThatThrownBy(() -> controller.result(123L))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.status).isEqualTo(HttpStatus.FORBIDDEN));
        verify(db, never()).list(anyString(), anyMap());
    }

    @Test
    void ownerCanReadFullSubmissionIncludingSourceCode() {
        when(auth.userId()).thenReturn(10L);
        when(db.one(anyString(), anyMap())).thenReturn(Map.of("user_id", 10L, "source_code", "owner code"));
        when(db.list(anyString(), anyMap())).thenReturn(List.of());

        assertThat(controller.result(123L)).containsEntry("source_code", "owner code");
    }

    @Test
    void adminCanReadAnotherUsersSubmission() {
        when(auth.userId()).thenReturn(1L);
        when(auth.isAdmin()).thenReturn(true);
        when(db.one(anyString(), anyMap())).thenReturn(Map.of("user_id", 20L, "source_code", "code"));
        when(db.list(anyString(), anyMap())).thenReturn(List.of());

        assertThat(controller.result(123L)).containsEntry("source_code", "code");
    }

    @Test
    void anonymousUserCannotQueryHistory() {
        when(auth.userId()).thenThrow(new ApiException(HttpStatus.UNAUTHORIZED, "TOKEN_INVALID", "Login required"));
        assertThatThrownBy(() -> controller.submissions(null, null, null, null, 0, 20))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.status).isEqualTo(HttpStatus.UNAUTHORIZED));
        verify(db, never()).list(anyString(), anyMap());
    }
}
