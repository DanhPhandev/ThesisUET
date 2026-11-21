package com.codeuet.user;

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

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserProfileUpdateTest {
    @Mock Db db;
    @Mock AuthService auth;
    @Mock AvatarStorageService avatars;
    UserController controller;

    @BeforeEach
    void setup() {
        controller = new UserController(db, auth, avatars);
    }

    @Test
    void updatesOnlyBiographyWithoutOverwritingNameOrSchool() {
        when(auth.userId()).thenReturn(12L);
        when(auth.user()).thenReturn(Map.of("id", 12L));
        when(auth.publicUser(anyMap())).thenReturn(Map.of("id", 12L));
        controller.editProfile(Map.of("bio", "  Thích lập trình  "));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(db).exec(sql.capture(), params.capture());
        assertThat(sql.getValue()).contains("bio=:bio", "WHERE id=:id")
                .doesNotContain("full_name=", "school=");
        assertThat(params.getValue()).containsEntry("id", 12L)
                .containsEntry("bio", "Thích lập trình");
    }

    @Test
    void updatesAllProfileFieldsAndAllowsClearingBiographyAndSchool() {
        when(auth.userId()).thenReturn(2L);
        when(auth.user()).thenReturn(Map.of("id", 2L));
        when(auth.publicUser(anyMap())).thenReturn(Map.of("id", 2L));
        controller.editProfile(Map.of("fullName", "CodeUET User", "bio", "", "school", "  "));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(db).exec(anyString(), params.capture());
        assertThat(params.getValue()).containsEntry("name", "CodeUET User")
                .containsEntry("id", 2L).containsKey("bio").containsKey("school");
        assertThat(params.getValue().get("bio")).isNull();
        assertThat(params.getValue().get("school")).isNull();
    }

    @Test
    void rejectsOverlongSchoolBeforeWritingAnything() {
        assertThatThrownBy(() -> controller.editProfile(Map.of("school", "x".repeat(151))))
                .isInstanceOf(ApiException.class);
        verify(db, never()).exec(anyString(), anyMap());
    }

    @Test
    void rejectsOverlongBiographyBeforeWritingAnything() {
        assertThatThrownBy(() -> controller.editProfile(Map.of("bio", "x".repeat(501))))
                .isInstanceOf(ApiException.class);
        verify(db, never()).exec(anyString(), anyMap());
    }

    @Test
    void rejectsUnknownFieldsAndEmptyPayload() {
        assertThatThrownBy(() -> controller.editProfile(Map.of("role", "ADMIN")))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> controller.editProfile(Map.of()))
                .isInstanceOf(ApiException.class);
        verify(db, never()).exec(anyString(), anyMap());
    }

    @Test
    void missingAuthenticationCannotUpdateOwnProfile() {
        when(auth.userId()).thenThrow(new ApiException(HttpStatus.UNAUTHORIZED, "TOKEN_INVALID", "Login required"));
        assertThatThrownBy(() -> controller.editProfile(Map.of("school", "UET")))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.status).isEqualTo(HttpStatus.UNAUTHORIZED));
        verify(db, never()).exec(anyString(), anyMap());
    }
}
