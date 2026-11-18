package com.example.demo.contract;

import au.com.dius.pact.consumer.MockServer;
import au.com.dius.pact.consumer.dsl.PactDslJsonArray;
import au.com.dius.pact.consumer.dsl.PactDslJsonBody;
import au.com.dius.pact.consumer.dsl.PactDslWithProvider;
import au.com.dius.pact.consumer.junit5.PactConsumerTestExt;
import au.com.dius.pact.consumer.junit5.PactTestFor;
import au.com.dius.pact.core.model.PactSpecVersion;
import au.com.dius.pact.core.model.RequestResponsePact;
import au.com.dius.pact.core.model.annotations.Pact;
import com.example.bff.adapter.out.claims.ApiClient;
import com.example.bff.adapter.out.claims.ApiException;
import com.example.bff.adapter.out.claims.generated.ClaimsApi;
import com.example.bff.adapter.out.claims.generated.UsersApi;
import com.example.bff.adapter.out.claims.generated.model.ClaimResponseDTO;
import com.example.bff.adapter.out.claims.generated.model.ClaimSummaryResponseDTO;
import com.example.bff.adapter.out.claims.generated.model.CreateClaimRequestDTO;
import com.example.bff.adapter.out.claims.generated.model.CreateUserRequestDTO;
import com.example.bff.adapter.out.claims.generated.model.UserResponseDTO;
import com.example.bff.adapter.out.claims.generated.model.UserRoleDTO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Consumer-driven contract tests for the BFF -> Claims Service interaction.
 *
 * <p>These exercise the real generated OkHttp client ({@link ApiClient} + {@link ClaimsApi} /
 * {@link UsersApi}) against a Pact mock server. The resulting pact file is written to
 * {@code bff-service/pacts/} (configured via the surefire {@code pact.rootDir} system property)
 * and is later replayed by the Claims Service provider verification test.</p>
 */
@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = "claims-service", pactVersion = PactSpecVersion.V3)
class ClaimsServiceConsumerPactTest {

    private static final String PROVIDER = "claims-service";
    private static final String CONSUMER = "bff-service";
    private static final String DT_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSSXXX";

    private ClaimsApi claimsApi(MockServer mockServer) {
        ApiClient client = new ApiClient();
        client.setBasePath(mockServer.getUrl());
        client.setBearerToken("user-jwt-token");
        return new ClaimsApi(client);
    }

    private UsersApi usersApi(MockServer mockServer) {
        ApiClient client = new ApiClient();
        client.setBasePath(mockServer.getUrl());
        client.setBearerToken("service-account-jwt-token");
        return new UsersApi(client);
    }

    // ------------------------------------------------------------------
    // POST /api/claims  (submit claim)
    // ------------------------------------------------------------------

    @Pact(consumer = CONSUMER, provider = PROVIDER)
    public RequestResponsePact createClaimPact(PactDslWithProvider builder) {
        return builder
                .given("an authenticated user can create a claim")
                .uponReceiving("a request to create a claim")
                .path("/api/claims")
                .method("POST")
                .matchHeader("Authorization", "Bearer .+", "Bearer user-jwt-token")
                .matchHeader("Content-Type", "application/json.*", "application/json")
                .body(new PactDslJsonBody()
                        .date("incidentDate", "yyyy-MM-dd")
                        .stringType("incidentLocation", "123 Main St, Springfield, IL")
                        .stringType("description", "Water damage to basement due to pipe burst")
                        .numberType("claimAmount", 5000.0))
                .willRespondWith()
                .status(201)
                .headers(Map.of("Content-Type", "application/json"))
                .body(new PactDslJsonBody()
                        .uuid("claimId")
                        .uuid("userId")
                        .date("incidentDate", "yyyy-MM-dd")
                        .stringType("incidentLocation", "123 Main St, Springfield, IL")
                        .stringType("description", "Water damage to basement due to pipe burst")
                        .numberType("claimAmount", 5000.0)
                        .stringType("status", "SUBMITTED")
                        .datetime("createdAt", DT_FORMAT)
                        .datetime("updatedAt", DT_FORMAT))
                .toPact();
    }

    @Test
    @PactTestFor(pactMethod = "createClaimPact")
    void createClaimHonoursContract(MockServer mockServer) throws ApiException {
        CreateClaimRequestDTO request = new CreateClaimRequestDTO()
                .incidentDate(LocalDate.of(2026, 2, 15))
                .incidentLocation("123 Main St, Springfield, IL")
                .description("Water damage to basement due to pipe burst")
                .claimAmount(5000.0);

        ClaimResponseDTO response = claimsApi(mockServer).createClaim(request);

        assertThat(response.getClaimId()).isNotNull();
        assertThat(response.getUserId()).isNotNull();
        assertThat(response.getStatus().getValue()).isEqualTo("SUBMITTED");
        assertThat(response.getClaimAmount()).isEqualTo(5000.0);
        assertThat(response.getCreatedAt()).isNotNull();
    }

    // ------------------------------------------------------------------
    // GET /api/claims  (list claims)
    // ------------------------------------------------------------------

    @Pact(consumer = CONSUMER, provider = PROVIDER)
    public RequestResponsePact listClaimsPact(PactDslWithProvider builder) {
        return builder
                .given("an authenticated user has at least one claim")
                .uponReceiving("a request to list the user's claims")
                .path("/api/claims")
                .method("GET")
                .matchHeader("Authorization", "Bearer .+", "Bearer user-jwt-token")
                .willRespondWith()
                .status(200)
                .headers(Map.of("Content-Type", "application/json"))
                .body(PactDslJsonArray.arrayMinLike(1)
                        .uuid("claimId")
                        .date("incidentDate", "yyyy-MM-dd")
                        .stringType("description", "Water damage to basement due to pipe burst")
                        .numberType("claimAmount", 5000.0)
                        .stringType("status", "SUBMITTED")
                        .datetime("createdAt", DT_FORMAT)
                        .closeObject())
                .toPact();
    }

    @Test
    @PactTestFor(pactMethod = "listClaimsPact")
    void listClaimsHonoursContract(MockServer mockServer) throws ApiException {
        List<ClaimSummaryResponseDTO> response = claimsApi(mockServer).listClaims();

        assertThat(response).isNotEmpty();
        ClaimSummaryResponseDTO first = response.get(0);
        assertThat(first.getClaimId()).isNotNull();
        assertThat(first.getStatus().getValue()).isEqualTo("SUBMITTED");
        assertThat(first.getCreatedAt()).isNotNull();
    }

    // ------------------------------------------------------------------
    // GET /api/claims/{claimId}  (found)
    // ------------------------------------------------------------------

    @Pact(consumer = CONSUMER, provider = PROVIDER)
    public RequestResponsePact getClaimPact(PactDslWithProvider builder) {
        return builder
                .given("a claim with id 660e8400-e29b-41d4-a716-446655440001 exists for the user")
                .uponReceiving("a request to get an existing claim by id")
                .path("/api/claims/660e8400-e29b-41d4-a716-446655440001")
                .method("GET")
                .matchHeader("Authorization", "Bearer .+", "Bearer user-jwt-token")
                .willRespondWith()
                .status(200)
                .headers(Map.of("Content-Type", "application/json"))
                .body(new PactDslJsonBody()
                        .uuid("claimId", UUID.fromString("660e8400-e29b-41d4-a716-446655440001"))
                        .uuid("userId")
                        .date("incidentDate", "yyyy-MM-dd")
                        .stringType("incidentLocation", "123 Main St, Springfield, IL")
                        .stringType("description", "Water damage to basement due to pipe burst")
                        .numberType("claimAmount", 5000.0)
                        .stringType("status", "SUBMITTED")
                        .datetime("createdAt", DT_FORMAT)
                        .datetime("updatedAt", DT_FORMAT))
                .toPact();
    }

    @Test
    @PactTestFor(pactMethod = "getClaimPact")
    void getClaimHonoursContract(MockServer mockServer) throws ApiException {
        ClaimResponseDTO response = claimsApi(mockServer)
                .getClaim(UUID.fromString("660e8400-e29b-41d4-a716-446655440001"));

        assertThat(response.getClaimId())
                .isEqualTo(UUID.fromString("660e8400-e29b-41d4-a716-446655440001"));
        assertThat(response.getStatus().getValue()).isEqualTo("SUBMITTED");
    }

    // ------------------------------------------------------------------
    // GET /api/claims/{claimId}  (not found)
    // ------------------------------------------------------------------

    @Pact(consumer = CONSUMER, provider = PROVIDER)
    public RequestResponsePact getClaimNotFoundPact(PactDslWithProvider builder) {
        return builder
                .given("no claim with id 110e8400-e29b-41d4-a716-4466554400ff exists")
                .uponReceiving("a request to get a non-existent claim by id")
                .path("/api/claims/110e8400-e29b-41d4-a716-4466554400ff")
                .method("GET")
                .matchHeader("Authorization", "Bearer .+", "Bearer user-jwt-token")
                .willRespondWith()
                .status(404)
                .headers(Map.of("Content-Type", "application/problem+json"))
                .body(new PactDslJsonBody()
                        .stringType("title", "Not Found")
                        .integerType("status", 404)
                        .stringType("detail", "Claim not found"))
                .toPact();
    }

    @Test
    @PactTestFor(pactMethod = "getClaimNotFoundPact")
    void getClaimNotFoundHonoursContract(MockServer mockServer) {
        ClaimsApi api = claimsApi(mockServer);
        UUID missing = UUID.fromString("110e8400-e29b-41d4-a716-4466554400ff");
        assertThatThrownBy(() -> api.getClaim(missing))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getCode()).isEqualTo(404));
    }

    // ------------------------------------------------------------------
    // GET /api/claims/{claimId}  (forbidden - belongs to another user)
    // ------------------------------------------------------------------

    @Pact(consumer = CONSUMER, provider = PROVIDER)
    public RequestResponsePact getClaimForbiddenPact(PactDslWithProvider builder) {
        return builder
                .given("a claim with id 770e8400-e29b-41d4-a716-4466554400aa belongs to another user")
                .uponReceiving("a request to get a claim owned by another user")
                .path("/api/claims/770e8400-e29b-41d4-a716-4466554400aa")
                .method("GET")
                .matchHeader("Authorization", "Bearer .+", "Bearer user-jwt-token")
                .willRespondWith()
                .status(403)
                .headers(Map.of("Content-Type", "application/problem+json"))
                .body(new PactDslJsonBody()
                        .stringType("title", "Forbidden")
                        .integerType("status", 403)
                        .stringType("detail", "Not authorized to access this claim"))
                .toPact();
    }

    @Test
    @PactTestFor(pactMethod = "getClaimForbiddenPact")
    void getClaimForbiddenHonoursContract(MockServer mockServer) {
        ClaimsApi api = claimsApi(mockServer);
        UUID forbidden = UUID.fromString("770e8400-e29b-41d4-a716-4466554400aa");
        assertThatThrownBy(() -> api.getClaim(forbidden))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getCode()).isEqualTo(403));
    }

    // ------------------------------------------------------------------
    // POST /api/users  (create user - success)
    // ------------------------------------------------------------------

    @Pact(consumer = CONSUMER, provider = PROVIDER)
    public RequestResponsePact createUserPact(PactDslWithProvider builder) {
        return builder
                .given("a user with the given id does not yet exist")
                .uponReceiving("a request to provision a new user")
                .path("/api/users")
                .method("POST")
                .matchHeader("Authorization", "Bearer .+", "Bearer service-account-jwt-token")
                .matchHeader("Content-Type", "application/json.*", "application/json")
                .body(new PactDslJsonBody()
                        .uuid("userId")
                        .stringType("email", "jane.doe@example.com")
                        .stringType("name", "Jane Doe")
                        .stringType("role", "CLAIMANT"))
                .willRespondWith()
                .status(201)
                .headers(Map.of("Content-Type", "application/json"))
                .body(new PactDslJsonBody()
                        .uuid("userId")
                        .stringType("email", "jane.doe@example.com")
                        .stringType("name", "Jane Doe")
                        .stringType("role", "CLAIMANT")
                        .datetime("createdAt", DT_FORMAT))
                .toPact();
    }

    @Test
    @PactTestFor(pactMethod = "createUserPact")
    void createUserHonoursContract(MockServer mockServer) throws ApiException {
        CreateUserRequestDTO request = new CreateUserRequestDTO()
                .userId(UUID.randomUUID())
                .email("jane.doe@example.com")
                .name("Jane Doe")
                .role(UserRoleDTO.CLAIMANT);

        UserResponseDTO response = usersApi(mockServer).createUser(request);

        assertThat(response.getUserId()).isNotNull();
        assertThat(response.getEmail()).isEqualTo("jane.doe@example.com");
        assertThat(response.getRole().getValue()).isEqualTo("CLAIMANT");
    }

    // ------------------------------------------------------------------
    // POST /api/users  (conflict - user already exists)
    // ------------------------------------------------------------------

    @Pact(consumer = CONSUMER, provider = PROVIDER)
    public RequestResponsePact createUserConflictPact(PactDslWithProvider builder) {
        return builder
                .given("a user with id 990e8400-e29b-41d4-a716-4466554400cc and email existing@example.com already exists")
                .uponReceiving("a request to provision a user that already exists")
                .path("/api/users")
                .method("POST")
                .matchHeader("Authorization", "Bearer .+", "Bearer service-account-jwt-token")
                .matchHeader("Content-Type", "application/json.*", "application/json")
                .body(new PactDslJsonBody()
                        .uuid("userId", UUID.fromString("990e8400-e29b-41d4-a716-4466554400cc"))
                        .stringType("email", "existing@example.com")
                        .stringType("name", "Existing User")
                        .stringType("role", "CLAIMANT"))
                .willRespondWith()
                .status(409)
                .headers(Map.of("Content-Type", "application/json"))
                .body(new PactDslJsonBody()
                        .uuid("userId", UUID.fromString("990e8400-e29b-41d4-a716-4466554400cc"))
                        .stringType("email", "existing@example.com")
                        .stringType("name", "Existing User")
                        .stringType("role", "CLAIMANT")
                        .datetime("createdAt", DT_FORMAT))
                .toPact();
    }

    @Test
    @PactTestFor(pactMethod = "createUserConflictPact")
    void createUserConflictHonoursContract(MockServer mockServer) {
        CreateUserRequestDTO request = new CreateUserRequestDTO()
                .userId(UUID.fromString("990e8400-e29b-41d4-a716-4466554400cc"))
                .email("existing@example.com")
                .name("Existing User")
                .role(UserRoleDTO.CLAIMANT);

        UsersApi api = usersApi(mockServer);
        assertThatThrownBy(() -> api.createUser(request))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).getCode()).isEqualTo(409));
    }
}
