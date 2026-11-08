# LearnLoop AI — Automated & Live Authentication Test Report

## 1. Test Suite Summary
- **Test Runner:** Playwright on Google Chrome
- **Test File:** `frontend/test_auth_lifecycle.mjs`
- **Total Test Cases:** 12
- **Passed:** 12 (100%)
- **Failed:** 0 (0%)

---

## 2. Detailed Execution Log

| Test ID | Test Scenario | Expected Outcome | Actual Outcome | Status |
|---|---|---|---|---|
| **AUTH-01** | Incorrect password for existing account (`pwkaran25@gmail.com`) | Rejection with HTTP 401 & clear message | "Incorrect password. Please verify your password and try again." displayed | **PASS** |
| **AUTH-02** | Valid sign-in for `pwkaran25@gmail.com` with `Password123!` | Successful session creation and UI state update | User authenticated as Karan; profile loaded | **PASS** |
| **AUTH-03** | Session persistence across browser reload (active session) | Retains authenticated user on page reload | Verified session restored seamlessly without re-prompting | **PASS** |
| **AUTH-04** | Sign out execution via Account Menu | Session invalidated; UI transitions to signed-out | User signed out; "Sign In" button visible | **PASS** |
| **AUTH-05** | Browser reload immediately following Sign Out | Strictly maintains unauthenticated state | Verified user remains signed out | **PASS** |
| **AUTH-06** | Returning user pre-fill convenience | Login modal displays remembered email without auto-login | Email input pre-filled with `pwkaran25@gmail.com` | **PASS** |
| **AUTH-07** | Registration collision with existing account | Clear message indicating account already exists | "An account with this email already exists. Please sign in instead." displayed | **PASS** |
| **AUTH-08** | One-click switch from register to login modal | Direct button switches mode and pre-fills email | Action button switches modal and focuses password field | **PASS** |
| **AUTH-09** | Seamless switch email pre-fill verification | Verified email is preserved across tab transition | Email value matches `pwkaran25@gmail.com` | **PASS** |
| **AUTH-10** | Unique brand-new learner account registration | Creates user in database and initializes profile | Verified new learner created and authenticated | **PASS** |
| **AUTH-11** | Multi-tab active session synchronization | Opening second tab synchronizes active session | Tab 2 opens authenticated with identical learner state | **PASS** |
| **AUTH-12** | Multi-tab logout invalidation via BroadcastChannel | Signing out in Tab 1 signs out Tab 2 automatically | Tab 2 instantaneously updates to signed-out state | **PASS** |
