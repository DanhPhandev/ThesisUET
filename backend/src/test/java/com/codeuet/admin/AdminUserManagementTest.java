package com.codeuet.admin;

import com.codeuet.auth.AuthService;
import com.codeuet.common.ApiException;
import com.codeuet.common.Db;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminUserManagementTest {
    @Mock Db db;
    @Mock AuthService auth;
    AdminController controller;

    @BeforeEach
    void setup() {
        controller = new AdminController(db, auth);
        lenient().when(db.m(any(Object[].class))).thenReturn(Map.of());
        lenient().when(auth.userId()).thenReturn(1L);
    }

    @Test
    void userListCastsCitextToStringAndSearchesByFullName() {
        when(db.list(anyString(), anyMap())).thenReturn(List.of());
        controller.users("Thanh");
        verify(auth).requireAdmin();
        verify(db).list(argThat(sql -> sql.contains("email::text AS email")
                && sql.contains("COALESCE(full_name, '') ILIKE :q")), anyMap());
    }

    @Test
    void canGrantSetterToAnotherAccountAndAuditIt() {
        when(db.maybe(anyString(), anyMap())).thenReturn(Map.of("id", 9L, "role", "USER", "status", "ACTIVE"));
        assertThat(controller.role(9L, Map.of("role", "SETTER"))).containsEntry("role", "SETTER");
        verify(db).exec(argThat(sql -> sql.contains("UPDATE users SET role=:r")), anyMap());
        verify(db).exec(argThat(sql -> sql.contains("INSERT INTO audit_logs")), anyMap());
    }

    @Test
    void forbidsEditingOwnRoleEvenForAdmin() {
        assertThatThrownBy(() -> controller.role(1L, Map.of("role", "USER")))
                .isInstanceOf(ApiException.class).hasMessageContaining("tự thay đổi quyền");
        verify(db, never()).exec(anyString(), anyMap());
    }

    @Test
    void forbidsLastActiveAdminFromBeingDemoted() {
        when(db.maybe(anyString(), anyMap())).thenReturn(Map.of("id", 9L, "role", "ADMIN", "status", "ACTIVE"));
        when(db.one(anyString(), anyMap())).thenReturn(Map.of("total", 1L));
        assertThatThrownBy(() -> controller.role(9L, Map.of("role", "USER")))
                .isInstanceOf(ApiException.class).hasMessageContaining("cuối cùng");
        verify(db, never()).exec(anyString(), anyMap());
    }

    @Test
    void forbidsInvalidRoleAndMissingUser() {
        assertThatThrownBy(() -> controller.role(9L, Map.of("role", "OWNER")))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> controller.role(9L, Map.of()))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> controller.role(9L, Map.of("role", "ADMIN")))
                .isInstanceOf(ApiException.class).hasMessageContaining("Không tìm thấy");
        verify(db, never()).exec(anyString(), anyMap());
    }

    @Test
    void forbidsNonAdminFromChangingOtherUsers() {
        doThrow(ApiException.forbidden()).when(auth).requireAdmin();
        assertThatThrownBy(() -> controller.role(9L, Map.of("role", "ADMIN")))
                .isInstanceOf(ApiException.class);
        verify(db, never()).exec(anyString(), anyMap());
    }

    @Test
    void lockingAccountRevokesRefreshSessions() {
        when(db.maybe(anyString(), anyMap())).thenReturn(Map.of("id", 9L, "role", "USER", "status", "ACTIVE"));
        assertThat(controller.status(9L, Map.of("status", "LOCKED"))).containsEntry("status", "LOCKED");
        verify(db).exec(argThat(sql -> sql.contains("UPDATE users SET status=:s")), anyMap());
        verify(db).exec(argThat(sql -> sql.contains("UPDATE refresh_tokens SET revoked_at")), anyMap());
    }

    @Test
    void forbidsDeactivatingLastActiveAdmin() {
        when(db.maybe(anyString(), anyMap())).thenReturn(Map.of("id", 9L, "role", "ADMIN", "status", "ACTIVE"));
        when(db.one(anyString(), anyMap())).thenReturn(Map.of("total", 1L));
        assertThatThrownBy(() -> controller.status(9L, Map.of("status", "BANNED")))
                .isInstanceOf(ApiException.class).hasMessageContaining("cuối cùng");
    }
}
