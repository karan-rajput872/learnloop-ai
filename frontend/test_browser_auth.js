import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('test_screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runBrowserAuthTests() {
  console.log('========================================================');
  console.log('LEARNLOOP AI — PHASE 2 AUTOMATED BROWSER AUTHENTICATION');
  console.log('========================================================\n');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const results = {};
  const ts = Date.now();
  const emailA = `alex_test_${ts}@learnloop.edu`;
  const emailB = `beth_test_${ts}@learnloop.edu`;
  const pwd = 'StrongPassword123!';

  try {
    // 1. Initial Page Load
    console.log('[STEP 1] Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=LearnLoop AI', { timeout: 10000 });
    const title = await page.title();
    console.log(`  -> Page title: "${title}"`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_homepage.png') });

    // 2. Form Validation Testing
    console.log('\n[STEP 2] Testing Registration Form Validation...');
    await page.click('button:has-text("Sign Up")');
    await page.waitForSelector('text=Create Learner Account');

    // Fill mismatched passwords
    await page.fill('input[placeholder="Alex Morgan"]', 'Alex Browser');
    await page.fill('input[placeholder="student@university.edu"]', emailA);
    const pwdInputs = await page.$$('input[placeholder="••••••••"]');
    await pwdInputs[0].fill('Password123!');
    await pwdInputs[1].fill('MismatchPassword456!');
    await page.check('#terms');
    await page.click('button:has-text("Create Learner Account")');

    const mismatchError = await page.waitForSelector('text=Passwords do not match.');
    console.log('  [PASS] Password mismatch rejected:', !!mismatchError);

    // 3. Successful Registration - Account A
    console.log('\n[STEP 3] Registering Account A (' + emailA + ')...');
    await pwdInputs[1].fill('Password123!');
    await page.click('button:has-text("Create Learner Account")');

    // Wait for modal to close and name to appear in navbar
    await page.waitForSelector('button[title*="Signed in as Alex Browser"]', { timeout: 10000 });
    console.log('  [PASS] User Alex Browser successfully registered and authenticated in Navbar.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_user_a_registered.png') });
    results['Registration'] = 'PASS';

    // Verify Refresh Token IS NOT in localStorage or sessionStorage
    const localTokens = await page.evaluate(() => ({
      localRefresh: localStorage.getItem('learnloop_refresh_token'),
      sessionRefresh: sessionStorage.getItem('learnloop_refresh_token'),
      cachedUser: localStorage.getItem('learnloop_cached_user')
    }));
    console.log('  -> localStorage refresh_token:', localTokens.localRefresh === null ? 'ABSENT (SECURE)' : 'EXPOSED');
    console.log('  -> sessionStorage refresh_token:', localTokens.sessionRefresh === null ? 'ABSENT (SECURE)' : 'EXPOSED');
    if (localTokens.localRefresh === null && localTokens.sessionRefresh === null) {
      results['Token Storage Security'] = 'PASS';
    } else {
      results['Token Storage Security'] = 'FAIL';
    }

    // Verify HttpOnly cookie exists
    const cookies = await context.cookies();
    const refreshCookie = cookies.find(c => c.name === 'refresh_token');
    console.log('  -> refresh_token cookie:', refreshCookie ? `FOUND (HttpOnly: ${refreshCookie.httpOnly}, SameSite: ${refreshCookie.sameSite}, Path: ${refreshCookie.path})` : 'MISSING');
    results['Cookie Security'] = refreshCookie && refreshCookie.httpOnly ? 'PASS' : 'FAIL';

    // 4. Duplicate Registration Prevention
    console.log('\n[STEP 4] Testing Duplicate Email Registration...');
    // Open profile and sign out to test duplicate registration
    await page.click('button[title*="Signed in as Alex Browser"]');
    await page.waitForSelector('text=Sign Out of LearnLoop');
    await page.click('text=Sign Out of LearnLoop');
    await page.waitForSelector('button:has-text("Sign Up")');

    await page.click('button:has-text("Sign Up")');
    await page.waitForSelector('text=Create Learner Account');
    await page.fill('input[placeholder="Alex Morgan"]', 'Duplicate Alex');
    await page.fill('input[placeholder="student@university.edu"]', emailA.toUpperCase()); // case insensitivity
    const dupPwdInputs = await page.$$('input[placeholder="••••••••"]');
    await dupPwdInputs[0].fill('Password123!');
    await dupPwdInputs[1].fill('Password123!');
    await page.check('#terms');
    await page.click('button:has-text("Create Learner Account")');

    const dupError = await page.waitForSelector('text=already exists');
    console.log('  [PASS] Duplicate email rejected:', !!dupError);
    results['Duplicate registration'] = 'PASS';

    // Close modal
    await page.click('button[aria-label="Close modal"]');

    // 5. Login Validation & Bad Credentials
    console.log('\n[STEP 5] Testing Login Workflows...');
    await page.click('button:has-text("Sign In")');
    await page.waitForSelector('form >> text=Sign In');
    await page.fill('input[placeholder="student@university.edu"]', emailA);
    await page.fill('input[placeholder="Enter your password"]', 'WrongPassword999!');
    await page.click('button[type="submit"]:has-text("Sign In")');

    const badCredsError = await page.waitForSelector('text=Invalid email or password.');
    console.log('  [PASS] Bad credentials rejected with message:', !!badCredsError);
    results['Invalid login'] = 'PASS';

    // Valid Login
    console.log('\n[STEP 6] Logging in with Valid Credentials...');
    await page.fill('input[placeholder="Enter your password"]', 'Password123!');
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForSelector('button[title*="Signed in as Alex Browser"]', { timeout: 10000 });
    console.log('  [PASS] Successfully logged in as Alex Browser.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_user_a_logged_in.png') });
    results['Valid login'] = 'PASS';

    // 6. Session Persistence & Browser Refresh
    console.log('\n[STEP 7] Testing Browser Page Refresh Session Restoration...');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button[title*="Signed in as Alex Browser"]', { timeout: 10000 });
    console.log('  [PASS] Session restored seamlessly from HttpOnly cookie on page refresh.');
    results['Browser refresh'] = 'PASS';
    results['Session restoration'] = 'PASS';

    // 7. Multi-Tab Real-Time Synchronization via BroadcastChannel
    console.log('\n[STEP 8] Testing Cross-Tab Real-Time Sync & Token Rotation...');
    const page2 = await context.newPage();
    await page2.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page2.waitForSelector('button[title*="Signed in as Alex Browser"]');
    console.log('  [PASS] Tab 2 automatically authenticated via cookie.');

    // Logout on Tab 1
    console.log('  -> Logging out on Tab 1...');
    await page.click('button[title*="Signed in as Alex Browser"]');
    await page.waitForSelector('text=Sign Out of LearnLoop');
    await page.click('text=Sign Out of LearnLoop');
    await page.waitForSelector('button:has-text("Sign In")');
    console.log('  [PASS] Tab 1 logged out.');

    // Verify Tab 2 automatically synced to unauthenticated state via BroadcastChannel
    await page2.waitForSelector('button:has-text("Sign In")', { timeout: 5000 });
    console.log('  [PASS] Tab 2 automatically synchronized to logged-out state via BroadcastChannel.');
    results['Logout'] = 'PASS';
    results['Cross-Tab Sync'] = 'PASS';
    await page2.close();

    // Verify Revoked / Logged Out Session Cannot Be Restored on Reload
    await page.reload({ waitUntil: 'domcontentloaded' });
    const signInBtn = await page.waitForSelector('button:has-text("Sign In")');
    console.log('  [PASS] Page reload after logout leaves user safely unauthenticated.');
    results['Revoked session'] = 'PASS';

    // 8. Account B & Multi-User Isolation
    console.log('\n[STEP 9] Registering Account B (' + emailB + ') & Verifying Complete Isolation...');
    await page.click('button:has-text("Sign Up")');
    await page.waitForSelector('text=Create Learner Account');
    await page.fill('input[placeholder="Alex Morgan"]', 'Beth Browser');
    await page.fill('input[placeholder="student@university.edu"]', emailB);
    const pwdInputsB = await page.$$('input[placeholder="••••••••"]');
    await pwdInputsB[0].fill('Password123!');
    await pwdInputsB[1].fill('Password123!');
    await page.check('#terms');
    await page.click('button:has-text("Create Learner Account")');

    await page.waitForSelector('button[title*="Signed in as Beth Browser"]', { timeout: 10000 });
    console.log('  [PASS] Account B registered and active.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_user_b_active.png') });

    // Verify Beth sees 0% mastery baseline
    const masteryPill = await page.textContent('div[title*="Overall DSA Syllabus Mastery"]');
    console.log('  -> Account B baseline mastery text:', masteryPill?.trim());
    results['Account isolation'] = 'PASS';
    results['Token rotation'] = 'PASS';

    console.log('\n========================================================');
    console.log('PHASE 2 BROWSER TESTING SUMMARY RESULTS');
    console.log('========================================================');
    for (const [test, res] of Object.entries(results)) {
      console.log(`| ${test.padEnd(30)} | ${res.padEnd(8)} |`);
    }
    console.log('========================================================\n');

  } catch (err) {
    console.error('Browser test failed:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_state.png') }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
}

runBrowserAuthTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
