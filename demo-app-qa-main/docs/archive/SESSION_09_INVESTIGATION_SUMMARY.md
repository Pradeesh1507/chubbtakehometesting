# Session 09: Keycloak Admin Authentication Investigation Summary

**Date:** Session 09  
**Task:** Investigate Keycloak Admin Client authentication failure (HTTP 401)  
**Status:** ✅ **ROOT CAUSE IDENTIFIED** | ✅ **MINIMAL FIX PROVIDED**

---

## Quick Facts

| Item | Value |
|------|-------|
| Error | HTTP 401 Unauthorized from Keycloak |
| Keycloak Error | `error="invalid_user_credentials"` for username="admin" |
| Root Cause | Password mismatch in Docker Compose configuration |
| Solution | Add 1 line to docker-compose.apps.yml |
| Risk Level | Very Low (configuration only) |
| Reversibility | Fully reversible |

---

## The Problem

```
Keycloak sets master admin password to: Admin123!
BFF attempts login with password: admin
Result: HTTP 401 Unauthorized
```

---

## Configuration Mismatch

### Where Keycloak Sets the Password

**File:** `docker-compose.infra.yml` (lines 109-111)

```yaml
keycloak:
  environment:
    KC_BOOTSTRAP_ADMIN_PASSWORD: Admin123!   # ← Master admin password
```

### Where BFF Should Get the Password

**File:** `docker-compose.apps.yml` (should have):

```yaml
bff-service:
  environment:
    KEYCLOAK_ADMIN_PASSWORD: Admin123!   # ← MISSING!
```

### What Actually Happens

**File:** `application.yml` (lines 44-51)

```yaml
keycloak:
  admin:
    password: ${KEYCLOAK_ADMIN_PASSWORD:admin}   # Default when env var not set
```

**Property Resolution:**
```
Environment variable KEYCLOAK_ADMIN_PASSWORD? Not set
↓
Use default from application.yml: admin
↓
BFF sends: admin
↓
Keycloak expects: Admin123!
↓
HTTP 401 Unauthorized ✗
```

---

## The Fix

### Single Line Addition

**File:** `docker-compose.apps.yml`

**Location:** `bff-service` → `environment` section

**Add this line:**

```yaml
KEYCLOAK_ADMIN_PASSWORD: Admin123!
```

### Full Context

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

---

## Why This Works

```
1. Environment variable KEYCLOAK_ADMIN_PASSWORD set to Admin123!
   ↓
2. Spring resolves ${KEYCLOAK_ADMIN_PASSWORD:admin} → Admin123! (from env)
   ↓
3. KeycloakConfig bean receives password: Admin123!
   ↓
4. Keycloak client authenticates with correct credentials
   ↓
5. BFF successfully obtains admin token
   ↓
6. User creation workflow becomes functional
```

---

## Configuration Files Involved

| File | Lines | Property | Current |
|------|-------|----------|---------|
| `docker-compose.infra.yml` | 109-111 | `KC_BOOTSTRAP_ADMIN_PASSWORD` | `Admin123!` ✓ |
| `docker-compose.apps.yml` | 42-55 | `KEYCLOAK_ADMIN_PASSWORD` | **(NOT SET)** ✗ |
| `application.yml` | 44-51 | `keycloak.admin.password` | `${...admin}` (default) |
| `KeycloakConfig.java` | 11-24 | Bean initialization | Correct code |
| `KeycloakAdminAdapter.java` | 22-29 | Adapter usage | Correct code |

---

## Verification

### After Applying Fix

```bash
# 1. Restart services
./stop-app.sh && ./stop-infra.sh
./start-infra.sh
sleep 60      # Wait for Keycloak
./start-app.sh
sleep 60      # Wait for BFF

# 2. Check logs (should not show auth error)
docker compose -f docker-compose.apps.yml logs bff-service | grep "invalid_user_credentials"
# Expected: No output

# 3. Test signup
curl -X POST http://localhost:8090/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@demo.com","password":"Test123!","name":"Test User"}'
# Expected: HTTP 201 Created
```

---

## Impact Assessment

| Factor | Assessment |
|--------|-----------|
| **Scope** | Configuration only (no code changes) |
| **Risk** | Very Low |
| **Files Changed** | 1 (docker-compose.apps.yml) |
| **Lines Added** | 1 |
| **Services Affected** | BFF service startup |
| **Data Impact** | None |
| **Reversibility** | Fully reversible |

---

## Related Documentation

For complete details, see:

- **[KEYCLOAK_ADMIN_AUTHENTICATION_ROOT_CAUSE.md](./KEYCLOAK_ADMIN_AUTHENTICATION_ROOT_CAUSE.md)** - Full investigation (12.7K characters)
  - Complete configuration flow trace
  - Code examples and evidence
  - Detailed verification strategy
  
- **[KEYCLOAK_FIX_QUICK_REFERENCE.md](./KEYCLOAK_FIX_QUICK_REFERENCE.md)** - Quick reference
  - Problem statement
  - Configuration mismatch
  - One-line fix

---

## Technical Details

### Authentication Flow (Current - Broken)

```
1. Keycloak starts with master admin: admin / Admin123!
2. BFF starts with KEYCLOAK_ADMIN_PASSWORD env var unset
3. Spring loads default from application.yml: admin
4. KeycloakConfig creates Keycloak client with password: admin
5. When adapter calls keycloak.realm(), Keycloak client attempts auth
6. POST /realms/master/protocol/openid-connect/token with:
   - username=admin
   - password=admin ← WRONG
   - grant_type=password
   - client_id=admin-cli
7. Keycloak validates: admin != hash(Admin123!) 
8. Returns: HTTP 401 {"error":"invalid_user_credentials"}
9. BFF startup fails during Keycloak bean initialization
```

### Authentication Flow (After Fix)

```
1. Keycloak starts with master admin: admin / Admin123!
2. BFF starts with KEYCLOAK_ADMIN_PASSWORD=Admin123! in Docker env
3. Spring loads from env: Admin123!
4. KeycloakConfig creates Keycloak client with password: Admin123!
5. When adapter calls keycloak.realm(), Keycloak client attempts auth
6. POST /realms/master/protocol/openid-connect/token with:
   - username=admin
   - password=Admin123! ← CORRECT
   - grant_type=password
   - client_id=admin-cli
7. Keycloak validates: Admin123! == hash(Admin123!)
8. Returns: HTTP 200 with access_token and refresh_token
9. BFF continues startup successfully
```

---

## Why Config Was Missing

**Root Cause Chain:**

1. `application.yml` defines default password: `admin` (for local development)
2. `docker-compose.infra.yml` sets Keycloak password: `Admin123!` (for security)
3. `docker-compose.apps.yml` does not explicitly set environment variable
4. Environment variables take precedence over defaults
5. Missing env var causes BFF to use weaker default
6. Infrastructure and application config not synchronized

**This is a common gap:** Infrastructure configuration and application configuration must stay synchronized for multi-service deployments.

---

## Conclusion

✅ **Root cause identified:** Configuration property mismatch  
✅ **Fix provided:** Add 1 environment variable line  
✅ **Risk assessed:** Very low  
✅ **Fully reversible:** Yes  

**Recommendation:** Apply the one-line fix to synchronize infrastructure and application configurations.
