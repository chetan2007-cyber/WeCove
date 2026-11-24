# 6. Authentication Root Cause Analysis

**Issue**: Users were unexpectedly logged out every time the mobile application was closed, refreshed, or backgrounded.  
**Severity**: High (Blocking onboarding and daily usage)  
**Resolution**: Permanent fix via Keystore SecureStore & Token Rotation  

---

## 1. Root Cause Breakdown

### Flaw 1: In-Memory Storage (`tokenStorage.ts`)
The legacy implementation of `tokenStorage.ts` stored the JWT strictly in JavaScript heap memory:
```typescript
class TokenStorage {
  private memoryToken: string | null = null;
  async getToken() { return this.memoryToken; }
  async setToken(t: string) { this.memoryToken = t; }
}
```
Whenever the Android OS killed the app process or the user swiped the app away, `memoryToken` was wiped. On subsequent launch, `restoreSession()` found `null` and instantly reset navigation to the Login screen.

### Flaw 2: Zero Token Refresh Architecture
The backend only issued a single access token with no refresh token mechanism. When the JWT expired or was rejected, `apiClient.ts` instantly executed `notifyUnauthorized()`, clearing state and kicking the user out.

### Flaw 3: Network Drop Fragility
If a user opened the app with weak connectivity, any initial network timeout was treated as an unauthenticated state, causing immediate logout rather than serving cached profile data.
