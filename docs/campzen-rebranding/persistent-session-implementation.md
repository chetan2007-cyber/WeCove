# 7. Persistent Session Implementation Report

**Architecture**: Keystore-backed SecureStore + Dual-Token Rotation + Single-Flight Retry Queue  
**Status**: Fully Implemented & Compiled into Release APK  

---

## 1. Mobile Client Implementation

### Keystore Storage (`tokenStorage.ts`)
- Utilizes `expo-secure-store` which encrypts data using Android Keystore System:
  - `campzen_access_token`: Short-lived JWT (30 minutes).
  - `campzen_refresh_token`: Opaque cryptographic 64-hex token (30 days).
  - `campzen_cached_user`: Serialized user profile for zero-flash startup.

### Single-Flight Interceptor Queue (`apiClient.ts`)
When any authenticated API call encounters HTTP 401:
1. All concurrent outgoing requests are queued.
2. A single refresh request is sent to `POST /api/auth/refresh`.
3. Upon receiving the new token pair, the queued requests are updated with the new Authorization header and retried automatically.
4. If and only if the refresh token is explicitly revoked or invalid does the client log out.

---

## 2. Backend Implementation

### Session Model (`session.model.js`)
- `userId`: Reference to User document.
- `tokenHash`: SHA-256 hash of the refresh token (never plaintext).
- `deviceInfo`: User-Agent / Device string.
- `isRevoked`: Boolean flag for immediate server-side revocation.
- `expiresAt`: Date with MongoDB TTL index for automatic expiration.

### Auth Controller Endpoints
- `POST /api/auth/login`: Issues `{ token, refreshToken, user }` and creates Session record.
- `POST /api/auth/refresh`: Implements Token Rotation. Replays of previously used refresh tokens invalidate the entire session tree.
- `POST /api/auth/logout`: Revokes active session in database.
