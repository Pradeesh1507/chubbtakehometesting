# Keycloak Admin Client Authentication Failure – Root Cause Analysis

**Investigation Date:** Session 08  
**Component:** BFF Keycloak Admin Client  
**Error:** HTTP 401 Unauthorized when obtaining admin access token  
**Root Cause:** Credential mismatch between Keycloak bootstrap configuration and BFF client configuration

---

## Executive Summary

The Keycloak Admin Client fails to authenticate with HTTP 401 Unauthorized (`error="invalid_user_credentials"`) because:

**The BFF is attempting to authenticate using credentials that DO NOT MATCH the Keycloak master realm admin user.**

- Keycloak creates the master realm admin user with credentials: `admin` / `Admin123!` (via `KC_BOOTSTRAP_ADMIN_*`)
- BFF attempts to authenticate with credentials: `admin` / `admin` (default from application.yml)
- Password mismatch: `Admin123!` ≠ `admin`

---

## Configuration Flow Analysis

### 1. Keycloak Bootstrap Configuration

**File:** `docker-compose.infra.yml` (lines 109-111)

```yaml
keycloak:
  environment:
    KC_BOOTSTRAP_ADMIN_USERNAME: admin
    KC_BOOTSTRAP_ADMIN_PASSWORD: Admin123!   # ← Master realm admin password
```

**What This Does:**
- During Keycloak startup, creates master realm admin user
- Username: `admin`
- Password: `Admin123!` (with capital A and special character)

**Evidence:**
- Keycloak version: `quay.io/keycloak/keycloak:26.5.2`
- Bootstrap environment variable: `KC_BOOTSTRAP_ADMIN_PASSWORD=Admin123!`
- This user is in the **master realm** (where `admin-cli` client exists)

---

### 2. BFF Keycloak Admin Configuration

**File:** `code/bff-service/src/main/resources/application.yml` (lines 44-51)

```yaml
keycloak:
  admin:
    server-url: ${KEYCLOAK_URL:http://localhost:8180}
    realm: master                                      # ← Admin realm
    target-realm: demo-app                            # ← Target realm for user creation
    username: ${KEYCLOAK_ADMIN_USERNAME:admin}        # ← Defaults to 'admin'
    password: ${KEYCLOAK_ADMIN_PASSWORD:admin}        # ← Defaults to 'admin'
    client-id: admin-cli
```

**What This Does:**
- Configures credentials to authenticate with Keycloak master realm
- Uses environment variables if set, otherwise defaults to literal strings
- Defaults: username=`admin`, password=`admin` (plain, no special characters)

**Default Credentials Issue:**
```
Default Password: admin
Expected Password: Admin123!
Match? NO ✗
```

---

### 3. How Credentials Flow to KeycloakAdminAdapter

**File:** `code/bff-service/src/main/java/com/example/demo/config/KeycloakConfig.java`

```java
@Bean
public Keycloak keycloak(
        @Value("${keycloak.admin.server-url}") String serverUrl,         // http://localhost:8180
        @Value("${keycloak.admin.realm:master}") String adminRealm,     // master
        @Value("${keycloak.admin.username}") String username,            // admin
        @Value("${keycloak.admin.password}") String password,            // admin (WRONG!)
        @Value("${keycloak.admin.client-id:admin-cli}") String clientId  // admin-cli
) {
    return KeycloakBuilder.builder()
            .serverUrl(serverUrl)                 // http://localhost:8180
            .realm(adminRealm)                    // master
            .username(username)                   // admin
            .password(password)                   // admin (DEFAULTS TO THIS)
            .clientId(clientId)                   // admin-cli
            .build();
}
```

**Execution Flow:**
1. Spring loads `application.yml`
2. `${KEYCLOAK_ADMIN_PASSWORD:admin}` resolves to default: `admin` (no env var set)
3. KeycloakBuilder constructs Keycloak client with password `admin`
4. When adapter calls `keycloak.realm(realm)`, Keycloak client attempts to authenticate
5. Keycloak client makes request to `/realms/master/protocol/openid-connect/token` with:
   - `username=admin`
   - `password=admin` ← INCORRECT (should be `Admin123!`)
   - `grant_type=password`
   - `client_id=admin-cli`
6. Keycloak returns: HTTP 401 Unauthorized with `error="invalid_user_credentials"`

**File:** `code/bff-service/src/main/java/com/example/demo/adapter/out/keycloak/KeycloakAdminAdapter.java` (line 22)

```java
public KeycloakAdminAdapter(
        Keycloak keycloak,  // ← Injected by Spring, configured with wrong password
        @Value("${keycloak.admin.target-realm:demo-app}") String realm
) {
    this.keycloak = keycloak;  // ← Contains unauthenticated client
    this.realm = realm;
}
```

When `createUser()` is called, it immediately attempts to use the unauthenticated client:
```java
public UUID createUser(String email, String password, String name, String role) {
    RealmResource realmResource = keycloak.realm(realm);  // ← Attempts to authenticate with wrong password
    // ...
}
```

---

## Keycloak Logs Evidence

**Error from Keycloak logs (as reported):**

```
realmName="master"
clientId="admin-cli"
error="invalid_user_credentials"
username="admin"
grant_type="password"
```

**Analysis:**
- Realm: `master` ✓ Correct (admin-cli client is in master realm)
- Client ID: `admin-cli` ✓ Correct (this is the administrative client)
- Error: `invalid_user_credentials` ✓ Confirms password mismatch
- Username: `admin` ✓ Username is correct
- Grant type: `password` ✓ Using password grant (expected)

**Why This Error Occurs:**
Keycloak validates the password against the master realm admin user. The user record stores password hash. When client provides password `admin` but master realm admin's password hash is for `Admin123!`, validation fails.

---

## Configuration Property Resolution

**Property:** `${KEYCLOAK_ADMIN_PASSWORD:admin}`

| Component | Setting | Value | Source |
|-----------|---------|-------|--------|
| Keycloak | `KC_BOOTSTRAP_ADMIN_PASSWORD` | `Admin123!` | docker-compose.infra.yml |
| BFF | `KEYCLOAK_ADMIN_PASSWORD` | (not set) | Environment |
| BFF fallback | Default if not set | `admin` | application.yml |
| **Result** | **What BFF uses** | **`admin`** | **Default (WRONG)** |

**Missing Connection:**
The environment variable `KEYCLOAK_ADMIN_PASSWORD` is **never set in docker-compose.apps.yml**. The BFF therefore uses the default value from application.yml: `admin`.

**Check:**
In `docker-compose.apps.yml`, there is **NO line** setting `KEYCLOAK_ADMIN_PASSWORD`.

```yaml
bff-service:
  environment:
    SPRING_KAFKA_BOOTSTRAP_SERVERS: kafka:29092
    SPRING_DATA_REDIS_HOST: redis
    CLAIMS_SERVICE_URL: http://claims-service:8080
    KEYCLOAK_URL: http://keycloak:8080
    # ... other properties ...
    # MISSING: KEYCLOAK_ADMIN_PASSWORD environment variable
```

---

## Configuration Comparison Table

| Property | Location | Configured Value | Type |
|----------|----------|------------------|------|
| `KC_BOOTSTRAP_ADMIN_USERNAME` | docker-compose.infra.yml | `admin` | Keycloak master admin |
| `KC_BOOTSTRAP_ADMIN_PASSWORD` | docker-compose.infra.yml | `Admin123!` | Keycloak master admin |
| `KEYCLOAK_ADMIN_USERNAME` | docker-compose.apps.yml | **(NOT SET)** | BFF fallback: `admin` |
| `KEYCLOAK_ADMIN_PASSWORD` | docker-compose.apps.yml | **(NOT SET)** | BFF fallback: `admin` |

**Mismatch:**
```
Keycloak sets master admin password to: Admin123!
BFF defaults to password: admin
Result: HTTP 401 Unauthorized ✗
```

---

## Root Cause Confirmed

| Aspect | Finding |
|--------|---------|
| **Keycloak Master Admin Username** | `admin` ✓ Configured in KC_BOOTSTRAP_ADMIN_USERNAME |
| **Keycloak Master Admin Password** | `Admin123!` ✓ Configured in KC_BOOTSTRAP_ADMIN_PASSWORD |
| **BFF Admin Username** | `admin` ✓ Matches Keycloak config |
| **BFF Admin Password** | `admin` ✗ DOES NOT MATCH – should be `Admin123!` |
| **Environment Variable Set** | `KEYCLOAK_ADMIN_PASSWORD` ✗ Not set in docker-compose.apps.yml |
| **BFF Falls Back To** | `admin` ✗ Default from application.yml |

---

## Minimal Recommended Correction

### Option 1: Set Environment Variable in docker-compose.apps.yml (RECOMMENDED)

Add the missing environment variable to the BFF service:

**File:** `docker-compose.apps.yml` → bff-service → environment

Add this line:
```yaml
KEYCLOAK_ADMIN_PASSWORD: Admin123!
```

**Full context:**
```yaml
bff-service:
  build:
    context: ./code/bff-service
  container_name: demo-bff-service
  ports:
    - "8090:8090"
  environment:
    SPRING_KAFKA_BOOTSTRAP_SERVERS: kafka:29092
    SPRING_DATA_REDIS_HOST: redis
    CLAIMS_SERVICE_URL: http://claims-service:8080
    KEYCLOAK_URL: http://keycloak:8080
    SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI: http://localhost:8180/realms/demo-app
    SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_JWK_SET_URI: http://keycloak:8080/realms/demo-app/protocol/openid-connect/certs
    WEBSOCKET_ALLOWED_ORIGINS: http://localhost:3001,http://localhost:3000
    KEYCLOAK_ADMIN_PASSWORD: Admin123!      # ← ADD THIS LINE
```

**Why This Works:**
- Explicit environment variable takes precedence over application.yml default
- Matches the Keycloak bootstrap password
- BFF will authenticate successfully with master realm admin user

**Risk:** Very Low
- Configuration-only change
- No code changes
- Aligns with infrastructure setup

---

## Verification Strategy

**After applying the fix:**

1. **Restart services:**
   ```bash
   docker compose -f docker-compose.infra.yml down
   docker compose -f docker-compose.apps.yml down
   ./start-infra.sh
   ./start-app.sh
   ```

2. **Check Keycloak logs (should not show 401 error):**
   ```bash
   docker compose -f docker-compose.apps.yml logs keycloak | grep -i "invalid_user_credentials"
   ```
   Expected: No output (error no longer appears)

3. **Check BFF logs (should show successful startup):**
   ```bash
   docker compose -f docker-compose.apps.yml logs bff-service | grep -i "keycloak\|signup"
   ```
   Expected: No authentication errors

4. **Test signup endpoint:**
   ```bash
   curl -X POST http://localhost:8090/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
   ```
   Expected: HTTP 201 (not 500 from authentication failure)

---

## Why This Mismatch Exists

**Root Cause Chain:**

1. **Keycloak Configuration** (docker-compose.infra.yml)
   - Sets master admin password: `Admin123!` (with complexity)
   
2. **BFF Default Configuration** (application.yml)
   - Defaults password to: `admin` (simple, for local development)
   
3. **Docker Compose Apps** (docker-compose.apps.yml)
   - Does not explicitly set `KEYCLOAK_ADMIN_PASSWORD` environment variable
   - Expected to match Keycloak bootstrap config, but doesn't
   
4. **Result:**
   - Local development (spring-boot:run) works if Keycloak admin password is manually set
   - Docker deployment fails because env var is missing

**This is a common integration gap:** Infrastructure config (Keycloak) and application config (BFF) are not synchronized. The fix ensures they match.

---

## Impact Assessment

**Services Affected:**
- BFF Service (cannot start, master realm admin authentication fails)
- Any dependent on BFF (UI cannot complete signup)

**Data Impact:**
- None (configuration only)

**Scope:**
- Affects all authentication operations during startup
- Once fixed, full user creation workflow becomes available

---

## Supporting Code Locations

| Component | File | Line(s) | Purpose |
|-----------|------|---------|---------|
| Keycloak Config | `KeycloakConfig.java` | 11-24 | Bean initialization with @Value injection |
| Property Defaults | `application.yml` | 44-51 | YAML defaults with ${...} syntax |
| Docker Infra | `docker-compose.infra.yml` | 109-111 | Keycloak environment variables |
| Docker Apps | `docker-compose.apps.yml` | 42-55 | BFF service environment variables |
| Admin Adapter | `KeycloakAdminAdapter.java` | 22-26 | Uses injected Keycloak client |
| Token Request | `KeycloakBuilder` (Keycloak SDK) | — | Creates password grant request |

---

## Conclusion

**The Issue:** BFF uses default password `admin` while Keycloak master admin password is `Admin123!`

**The Fix:** Set environment variable `KEYCLOAK_ADMIN_PASSWORD=Admin123!` in docker-compose.apps.yml

**The Effort:** 1 line addition to YAML configuration

**The Risk:** Negligible (configuration alignment, no code changes)

**Expected Outcome:** BFF successfully authenticates with Keycloak master realm, user creation workflow becomes functional
