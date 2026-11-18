# Keycloak Admin Authentication – Quick Fix Reference

## Problem
BFF signup endpoint fails: HTTP 401 Unauthorized from Keycloak master realm

```
Keycloak Error Log:
realmName="master"
error="invalid_user_credentials"
username="admin"
```

## Root Cause
Password mismatch:
- **Keycloak sets master admin password to:** `Admin123!`
- **BFF attempts login with password:** `admin` (default from application.yml)
- **Result:** Unauthorized

## Configuration Mismatch

```
docker-compose.infra.yml:
  Keycloak master admin: admin / Admin123!

docker-compose.apps.yml:
  BFF environment: (KEYCLOAK_ADMIN_PASSWORD not set)
  
application.yml:
  BFF fallback default: admin / admin  ← WRONG!
```

## Fix: One Line Addition

**File:** `docker-compose.apps.yml`

**Service:** `bff-service` → `environment` section

**Add this line:**
```yaml
KEYCLOAK_ADMIN_PASSWORD: Admin123!
```

**Full section after fix:**
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
    KEYCLOAK_ADMIN_PASSWORD: Admin123!      # ← ADD THIS
```

## Verification

After applying fix:

1. Restart services:
   ```bash
   ./stop-app.sh && ./stop-infra.sh
   ./start-infra.sh && sleep 60 && ./start-app.sh
   ```

2. Test signup:
   ```bash
   curl -X POST http://localhost:8090/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
   ```
   Expected: HTTP 201 (not 500)

3. Check logs:
   ```bash
   docker compose -f docker-compose.apps.yml logs bff-service | tail -20
   ```
   Expected: No "invalid_user_credentials" errors

## Why This Works

```
Configuration Flow:
1. application.yml defines property: keycloak.admin.password = ${KEYCLOAK_ADMIN_PASSWORD:admin}
2. Docker sets environment: KEYCLOAK_ADMIN_PASSWORD=Admin123!
3. Spring resolves: ${KEYCLOAK_ADMIN_PASSWORD:...} → Admin123! (from env)
4. KeycloakConfig bean uses: password = Admin123! ✓
5. Keycloak authentication succeeds
6. User creation workflow works
```

## Impact

| Aspect | Status |
|--------|--------|
| Code changes | None |
| Configuration changes | 1 line |
| Risk | Very Low |
| Services affected | BFF startup |
| Data impact | None |
| Reversibility | Fully reversible |

## Related Documentation

- Full analysis: `docs/KEYCLOAK_ADMIN_AUTHENTICATION_ROOT_CAUSE.md`
- Configuration properties: `code/bff-service/src/main/resources/application.yml` (lines 44-51)
- Docker setup: `docker-compose.infra.yml` (lines 109-111) and `docker-compose.apps.yml` (lines 42-55)
