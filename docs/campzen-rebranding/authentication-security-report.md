# 9. Authentication Security & Cryptographic Review

**Compliance**: Mobile Security Best Practices (OWASP MASVS)  
**Encryption**: AES-256-GCM via Android Keystore  
**Hashing**: SHA-256 for Refresh Tokens; bcrypt for Passwords  

---

## Security Architecture

1. **At-Rest Protection**:
   - Access and refresh tokens are never written to `AsyncStorage`, `SharedPreferences`, or plain SQLite.
   - Encrypted in hardware-backed Android Keystore via `expo-secure-store`.

2. **In-Transit Protection**:
   - All network calls enforce HTTPS (TLS 1.3 / 1.2) via `api.wecove.in`.
   - Strict Content Security Policy (CSP) and HSTS enabled.

3. **Database Hash Storage**:
   - Refresh tokens are generated as 256-bit random cryptographic hex strings.
   - Only `crypto.createHash('sha256').update(token).digest('hex')` is stored in MongoDB. Even with database read access, tokens cannot be forged.

4. **Replay & Suspension Controls**:
   - Refresh tokens are single-use (rotated on every refresh).
   - If a duplicate attempt is detected, the compromised session is revoked immediately.
