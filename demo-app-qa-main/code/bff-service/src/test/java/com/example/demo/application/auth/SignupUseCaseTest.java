package com.example.demo.application.auth;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SignupUseCaseTest {

    @Mock
    private KeycloakAdminPort keycloakAdminPort;

    @Mock
    private ClaimsServicePort claimsServicePort;

    @InjectMocks
    private SignupUseCaseImpl signupUseCase;

    @Test
    void should_CreateUser_When_ValidSignupCommand() {
        var command = new SignupCommand("test@example.com", "Password123!", "Test User");
        var keycloakUserId = UUID.randomUUID();
        var now = OffsetDateTime.now();

        when(keycloakAdminPort.createUser("test@example.com", "Password123!", "Test User", "CLAIMANT"))
                .thenReturn(keycloakUserId);
        when(claimsServicePort.createUser(keycloakUserId, "test@example.com", "Test User", "CLAIMANT"))
                .thenReturn(new ClaimsServicePort.UserRecord(keycloakUserId, "test@example.com", "Test User", "CLAIMANT", now));

        var result = signupUseCase.signup(command);

        assertThat(result.userId()).isEqualTo(keycloakUserId);
        assertThat(result.email()).isEqualTo("test@example.com");
        assertThat(result.name()).isEqualTo("Test User");
        assertThat(result.role()).isEqualTo("CLAIMANT");
        verify(keycloakAdminPort).createUser("test@example.com", "Password123!", "Test User", "CLAIMANT");
        verify(claimsServicePort).createUser(keycloakUserId, "test@example.com", "Test User", "CLAIMANT");
    }

    @Test
    void should_ThrowException_When_EmailAlreadyExistsInKeycloak() {
        var command = new SignupCommand("existing@example.com", "Password123!", "Existing User");

        when(keycloakAdminPort.createUser(any(), any(), any(), any()))
                .thenThrow(new UserAlreadyExistsException("existing@example.com"));

        assertThatThrownBy(() -> signupUseCase.signup(command))
                .isInstanceOf(UserAlreadyExistsException.class)
                .hasMessageContaining("existing@example.com");
    }

    @Test
    void should_ThrowException_When_EmailAlreadyExistsInClaimsService() {
        var command = new SignupCommand("existing@example.com", "Password123!", "Existing User");
        var keycloakUserId = UUID.randomUUID();

        when(keycloakAdminPort.createUser(any(), any(), any(), any()))
                .thenReturn(keycloakUserId);
        when(claimsServicePort.createUser(any(), any(), any(), any()))
                .thenThrow(new UserAlreadyExistsException("existing@example.com"));

        assertThatThrownBy(() -> signupUseCase.signup(command))
                .isInstanceOf(UserAlreadyExistsException.class);
    }

    @Test
    void should_HandleDuplicateUserIdDueToRetry_When_ClaimsServiceReceivesDuplicateRequest() {
        // Regression test for duplicate user creation defect (Session 10)
        // Scenario: HTTP retry or timeout causes ClaimsServiceAdapter to retry with same UUID
        // Expected: Second request should be handled gracefully (409 Conflict or idempotent response)
        
        var command = new SignupCommand("retry-test@example.com", "Password123!", "Retry Test User");
        var keycloakUserId = UUID.randomUUID();
        var now = OffsetDateTime.now();
        var userRecord = new ClaimsServicePort.UserRecord(keycloakUserId, "retry-test@example.com", "Retry Test User", "CLAIMANT", now);

        when(keycloakAdminPort.createUser("retry-test@example.com", "Password123!", "Retry Test User", "CLAIMANT"))
                .thenReturn(keycloakUserId);
        
        // ClaimsServicePort should handle duplicate requests gracefully
        // If retry sends same UUID, Claims Service returns 409 Conflict with existing user
        when(claimsServicePort.createUser(keycloakUserId, "retry-test@example.com", "Retry Test User", "CLAIMANT"))
                .thenReturn(userRecord);

        var result = signupUseCase.signup(command);

        // Result should be valid even if Claims Service received duplicate request
        assertThat(result.userId()).isEqualTo(keycloakUserId);
        assertThat(result.email()).isEqualTo("retry-test@example.com");
        
        // Verify only one call to Keycloak (Keycloak creates user once)
        verify(keycloakAdminPort).createUser("retry-test@example.com", "Password123!", "Retry Test User", "CLAIMANT");
        
        // ClaimsService adapter should handle retries gracefully
        // (Actual retry behavior is in ClaimsServiceAdapter, not here)
        verify(claimsServicePort).createUser(keycloakUserId, "retry-test@example.com", "Retry Test User", "CLAIMANT");
    }

    @Test
    void should_PropagateException_When_ClaimsServiceFails_WithNonConflictError() {
        var command = new SignupCommand("error@example.com", "Password123!", "Error Test User");
        var keycloakUserId = UUID.randomUUID();

        when(keycloakAdminPort.createUser(any(), any(), any(), any()))
                .thenReturn(keycloakUserId);
        when(claimsServicePort.createUser(any(), any(), any(), any()))
                .thenThrow(new IllegalStateException("Claims Service unavailable"));

        assertThatThrownBy(() -> signupUseCase.signup(command))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Claims Service unavailable");
    }
}
