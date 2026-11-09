# LearnLoop AI — Authentication Security & Cryptographic Posture Audit

## 1. Cryptographic Standards Implemented

### A. Password Hashing (Argon2id)
- **Algorithm:** Argon2id (OWASP recommended password hash) via Python `passlib.context.CryptContext(schemes=["argon2"])`.
- **Parameters:** High-memory and multi-iteration resistant against GPU/ASIC parallel dictionary attacks.
- **Comparison:** Constant-time hash verification via `argon2.verify()` to prevent side-channel timing attacks.

### B. Session & Token Cryptography
- **Access Tokens:** Signed JWT tokens using HS256 with cryptographically strong secret (`JWT_SECRET_KEY`). Short-lived (30 minutes) to minimize exposure.
- **Refresh Tokens:** High-entropy 256-bit random secrets (`secrets.token_urlsafe(32)`).
- **Database Storage:** Stored as SHA-256 hashes (`hash_token()`). Plaintext refresh tokens are never persisted in the database.
- **Rotation & Reuse Detection:** Each refresh request rotates the token. If an already-rotated or revoked token is presented outside the concurrency grace window, the entire session chain is revoked.

### C. Cookie Protection Attributes
- `HttpOnly`: Strictly true to block XSS credential exfiltration.
- `Secure`: True under HTTPS to prevent transmission over cleartext connections.
- `SameSite`: Configured to `None` with `Secure=True` in production HTTPS to permit legitimate cross-origin requests from `vercel.app` to `onrender.com`.
- `Path`: Scoped to `/api/auth`.

