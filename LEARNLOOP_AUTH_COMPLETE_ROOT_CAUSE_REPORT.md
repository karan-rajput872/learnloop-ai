# LearnLoop AI — Complete Authentication Root-Cause & Architectural Forensics Report

## 1. Executive Summary

This report documents the forensic investigation and resolution of critical authentication defects identified in LearnLoop AI, covering email/password login, registration collision handling, logout session invalidation, Google Identity Services (GIS) integration, cross-origin cookies between Vercel and Render, and multi-tab session synchronization.

---

## 2. Identified Root Causes

### Defect 1: Logout Invalidation Failure & Automatic Session Restoration
- **Mechanism:** In `frontend/src/services/auth.ts`, `refreshSession()` previously had a fallback block checking `LAST_USER_KEY` (`learnloop_last_user`).
- **Trigger:** When a user clicked "Sign Out", the explicit token and `USER_CACHE_KEY` were purged, but `LAST_USER_KEY` remained (designed to pre-fill the email in login forms).
- **Impact:** Upon reloading the page, `AuthContext.tsx` invoked `refreshSession()`. When backend cookie refresh failed or returned 401, the client retrieved `LAST_USER_KEY`, generated a new session token, and automatically logged the user back in, rendering Sign Out completely ineffective.
- **Resolution:** Removed the `LAST_USER_KEY` session synthesis from `refreshSession()`. Added an explicit `learnloop_explicit_logout` marker in `sessionStorage` on logout to prevent unauthorized session resurrection.

### Defect 2: Cross-Origin Cookie Dropping (Vercel to Render)
- **Mechanism:** Frontend is hosted on `https://learnloop-ai-one.vercel.app` while backend runs on `https://learnloop-ai-backend.onrender.com`. These are different top-level domains.
- **Trigger:** In `backend/app/routes/auth.py`, `COOKIE_SAMESITE` was set to `"lax"`. Modern browsers strictly block `SameSite=Lax` cookies on cross-origin fetch requests even with `credentials: 'include'`.
- **Impact:** `refresh_token` HttpOnly cookies set by Render were not transmitted in subsequent requests from Vercel, causing `/api/auth/refresh` to constantly return 401.
- **Resolution:** Updated `backend/app/routes/auth.py` so that under HTTPS, cookies are configured with `SameSite=None; Secure=True`. In addition, implemented dual-channel token acceptance: `POST /api/auth/refresh` and `POST /api/auth/logout` accept the token from request body JSON payload in addition to cookies.

### Defect 3: Infinite Render Loop in Session Restoration
- **Mechanism:** In `frontend/src/context/AuthContext.tsx`, `restoreSession` was wrapped in `useCallback` with `user` in its dependency array.
- **Trigger:** Inside `restoreSession`, calling `setUser(u)` changed the `user` reference, regenerating `restoreSession`, which in turn triggered the mount `useEffect` repeatedly.
- **Impact:** Browser flooded network with hundreds of 401 requests per second, triggering Cloudflare rate-limiting.
- **Resolution:** Stabilized `restoreSession` dependencies, eliminated `user` from callback dependencies, and removed destructive on-mount cleanup that deleted the refresh token.

### Defect 4: Registration Collision & Generic Error Reporting
- **Mechanism:** When registering an account that already exists (e.g., `pwkaran25@gmail.com`), backend returned `409 Conflict`.
- **Trigger:** `frontend/src/services/auth.ts` attempted silent fallback, and if the password did not match, threw an unhandled error leading to the generic modal message: *"Registration failed. Please check your information and try again."*
- **Resolution:** If the entered credentials match the existing account, backend and frontend now immediately authenticate the user. If passwords differ, the client displays a clear message *"An account with this email already exists. Please sign in instead."* along with a direct one-click button to switch to the login tab with email pre-filled.

### Defect 5: Google One-Tap & Base64 Decoding Glitch
- **Mechanism:** Google Identity Services returns an unpadded base64url-encoded JWT credential. Calling native `window.atob()` without padding or UTF-8 decoding threw `DOMException`.
- **Resolution:** Hardened `parseJwtPayload` with proper `=`-padding and `TextDecoder('utf-8')`. Updated `AuthModal.tsx` to cleanly handle Google GIS render states without duplicate buttons.
