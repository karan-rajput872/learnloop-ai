import { chromium } from 'playwright';

async function runAuthLifecycleTests() {
  console.log('=== STARTING LEARNLOOP AUTHENTICATION LIFECYCLE TESTS ===\n');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`[PASS] ${testName} ${detail ? '(' + detail + ')' : ''}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? '(' + detail + ')' : ''}`);
      failed++;
    }
  }

  async function dismissOnboardingIfPresent() {
    try {
      const closeWizard = page.locator('button[aria-label="Close"]');
      if (await closeWizard.count() > 0 && await closeWizard.isVisible()) {
        await closeWizard.click();
        await page.waitForTimeout(500);
      }
    } catch {}
  }

  try {
    // Navigate to local frontend
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
    console.log('Page loaded successfully.\n');

    // TEST 1: Reject incorrect password on existing account
    console.log('--- TEST 1: Incorrect Password Rejection ---');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: 'networkidle' });

    // Open Sign In modal
    const signInBtn = page.locator('button:has-text("Sign In")').first();
    await signInBtn.click();
    await page.waitForSelector('text=Welcome Back to LearnLoop', { timeout: 5000 });

    // Enter email and incorrect password
    await page.fill('input[type="email"]', 'pwkaran25@gmail.com');
    await page.fill('input[type="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]:has-text("Sign In to LearnLoop")');

    // Wait for error banner or response
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent('body');
    console.log('Error box content check: has Incorrect password?', bodyText.includes('Incorrect password'));
    if (!bodyText.includes('Incorrect password')) {
      console.log('Snippet of modal text:', await page.locator('div[role="dialog"], .relative.w-full.max-w-md').first().innerText().catch(() => 'no dialog'));
    }
    await page.waitForSelector('text=Incorrect password', { timeout: 6000 });
    const hasIncorrectPwdMsg = await page.locator('text=Incorrect password').count();
    assert(hasIncorrectPwdMsg > 0, 'Incorrect password correctly rejected with specific error message');

    // Close modal
    await page.click('button[aria-label="Close modal"]');
    await page.waitForTimeout(500);

    // TEST 2: Successful Sign In with existing account
    console.log('\n--- TEST 2: Sign In with Existing Account (pwkaran25@gmail.com) ---');
    await signInBtn.click();
    await page.waitForSelector('text=Welcome Back to LearnLoop', { timeout: 5000 });

    await page.fill('input[type="email"]', 'pwkaran25@gmail.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]:has-text("Sign In to LearnLoop")');

    // Verify authenticated state
    await page.waitForSelector('text=Karan', { timeout: 8000 });
    const isUserShown = await page.locator('text=Karan').count();
    assert(isUserShown > 0, 'Existing user pwkaran25@gmail.com successfully signed in');

    // TEST 3: Session Persistence across reload (when NOT logged out)
    console.log('\n--- TEST 3: Session Persistence Across Reload (No Logout) ---');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const isUserStillShown = await page.locator('text=Karan').count();
    assert(isUserStillShown > 0, 'Session successfully persisted and restored on reload');

    // TEST 4: Sign Out and Verified Invalidation
    console.log('\n--- TEST 4: Sign Out and Verified Invalidation ---');
    await dismissOnboardingIfPresent();
    // Click account menu trigger (avatar pill)
    const accountTrigger = page.locator('button[aria-label="Account and application options"]');
    await accountTrigger.click();
    await page.waitForSelector('text=Sign Out', { timeout: 5000 });

    const signOutBtn = page.locator('button[role="menuitem"]:has-text("Sign Out")');
    await signOutBtn.click();
    await page.waitForTimeout(1000);

    // Verify user is signed out
    const signInVisible = await page.locator('button:has-text("Sign In")').first().isVisible();
    assert(signInVisible, 'User successfully signed out, Sign In button visible');

    // TEST 5: Reload after Sign Out does NOT auto-login
    console.log('\n--- TEST 5: Reload after Sign Out Remains Signed Out ---');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const signInStillVisible = await page.locator('button:has-text("Sign In")').first().isVisible();
    const userNotVisible = (await page.locator('button[aria-label="Account and application options"]').count()) === 0;
    assert(signInStillVisible && userNotVisible, 'Reload after Sign Out strictly maintains logged-out state');

    // Open Sign In modal to verify returning user email is remembered for convenience without auto-logging in
    await page.locator('button:has-text("Sign In")').first().click();
    await page.waitForSelector('text=Welcome Back to LearnLoop', { timeout: 5000 });
    const emailVal = await page.inputValue('input[type="email"]');
    assert(emailVal === 'pwkaran25@gmail.com', 'Returning user email is pre-filled in login form', emailVal);
    await page.click('button[aria-label="Close modal"]');

    // TEST 6: Register Existing Account with Different Password
    console.log('\n--- TEST 6: Register with Existing Email Shows Clear Guidance ---');
    const getStartedBtn = page.locator('button:has-text("Get Started Free")').first();
    await getStartedBtn.click();
    await page.waitForSelector('text=Create Your Learner Account', { timeout: 5000 });

    await page.fill('input[placeholder="Alex Morgan"]', 'Karan Test');
    await page.fill('input[type="email"]', 'pwkaran25@gmail.com');
    await page.locator('input[type="password"]').first().fill('DifferentPassword123!');
    await page.locator('input[type="password"]').nth(1).fill('DifferentPassword123!');
    await page.check('input#terms');
    await page.click('button[type="submit"]:has-text("Create Learner Account")');

    await page.waitForSelector('text=already exists', { timeout: 6000 });
    const hasAlreadyExists = await page.locator('text=already exists').count();
    assert(hasAlreadyExists > 0, 'Registering existing email gives clear already-exists guidance');

    const hasSwitchBtn = await page.locator('button:has-text("Sign in to this account")').count();
    assert(hasSwitchBtn > 0, 'One-click switch to login modal is presented');

    // Click switch to login
    await page.click('button:has-text("Sign in to this account")');
    await page.waitForSelector('text=Welcome Back to LearnLoop', { timeout: 5000 });
    const switchedEmail = await page.inputValue('input[type="email"]');
    assert(switchedEmail === 'pwkaran25@gmail.com', 'Switch button pre-filled existing email into login form');
    await page.click('button[aria-label="Close modal"]');

    // TEST 7: Register Brand-New Account
    console.log('\n--- TEST 7: Register Brand-New Unique Account ---');
    const uniqueEmail = `test_${Date.now()}@learnloop.ai`;
    await getStartedBtn.click();
    await page.waitForSelector('text=Create Your Learner Account', { timeout: 5000 });

    await page.fill('input[placeholder="Alex Morgan"]', 'Automated Learner');
    await page.fill('input[type="email"]', uniqueEmail);
    await page.locator('input[type="password"]').first().fill('StrongPass123!');
    await page.locator('input[type="password"]').nth(1).fill('StrongPass123!');
    await page.check('input#terms');
    await page.click('button[type="submit"]:has-text("Create Learner Account")');

    await page.waitForSelector('text=Automated Learner', { timeout: 8000 });
    const isNewUserRegistered = await page.locator('text=Automated Learner').count();
    assert(isNewUserRegistered > 0, `New user ${uniqueEmail} registered and authenticated`);

    // TEST 8: Multi-Tab Logout Synchronization
    console.log('\n--- TEST 8: Multi-Tab Logout Synchronization ---');
    await page.waitForTimeout(1000);
    await dismissOnboardingIfPresent();
    const page2 = await context.newPage();
    await page2.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
    await page2.waitForSelector('text=Automated Learner', { timeout: 6000 });
    assert(true, 'Tab 2 opened with synchronized active session');

    // Ensure onboarding modal on tab 1 is dismissed before clicking account menu
    await page.bringToFront();
    await dismissOnboardingIfPresent();
    await page.waitForTimeout(500);

    // Log out on Tab 1
    const tab1AccountTrigger = page.locator('button[aria-label="Account and application options"]');
    await tab1AccountTrigger.click();
    await page.waitForSelector('text=Sign Out', { timeout: 5000 });
    await page.locator('button[role="menuitem"]:has-text("Sign Out")').click();
    await page.waitForTimeout(1000);

    // Verify Tab 2 is automatically logged out via BroadcastChannel
    await page2.waitForTimeout(1000);
    const tab2SignInVisible = await page2.locator('button:has-text("Sign In")').first().isVisible();
    assert(tab2SignInVisible, 'Tab 2 automatically updated to signed-out state via BroadcastChannel');

    await page2.close();

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n==================================================');
  console.log(`AUTH TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthLifecycleTests();
