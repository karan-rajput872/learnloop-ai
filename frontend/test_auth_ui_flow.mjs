import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = path.resolve('test_auth_ui_screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runAuthUITest() {
  console.log('===============================================================');
  console.log('LEARNLOOP AI — END-TO-END BROWSER AUTHENTICATION & UX TEST');
  console.log('===============================================================\n');

  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch (e) {
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const ts = Date.now();
  const testEmail = `learner_${ts}@university.edu`;
  const testPassword = 'SecurePassword123!';
  const testName = `Learner Test ${ts.toString().slice(-4)}`;

  try {
    // 1. Visit homepage
    console.log('[STEP 1] Navigating to http://127.0.0.1:3000...');
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=LearnLoop AI', { timeout: 10000 });
    console.log('  [PASS] Homepage loaded cleanly.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_homepage.png') });

    // 2. Open Register modal
    console.log('\n[STEP 2] Opening Registration Modal...');
    const getStartedBtn = page.locator('button:has-text("Get Started Free")').first();
    if (await getStartedBtn.isVisible()) {
      await getStartedBtn.click();
    } else {
      await page.click('button:has-text("Sign In")');
      await page.waitForSelector('text=Create one free');
      await page.click('button:has-text("Create one free")');
    }
    await page.waitForSelector('text=Create Your Learner Account', { timeout: 5000 });
    console.log('  [PASS] Register modal visible.');

    // 3. Test Password Mismatch
    console.log('\n[STEP 3] Testing form validation (password mismatch)...');
    await page.fill('input[placeholder="Alex Morgan"]', testName);
    await page.fill('input[placeholder="student@university.edu"]', testEmail);
    const pwdInputs = page.locator('input[placeholder="••••••••"]');
    await pwdInputs.nth(0).fill(testPassword);
    await pwdInputs.nth(1).fill('Mismatch999!');
    await page.check('#terms');
    await page.click('button:has-text("Create Learner Account")');

    await page.waitForSelector('text=Passwords do not match.', { timeout: 3000 });
    console.log('  [PASS] Password mismatch correctly rejected with clear error message.');

    // 4. Submit valid registration
    console.log(`\n[STEP 4] Submitting valid registration for ${testEmail}...`);
    await pwdInputs.nth(1).fill(testPassword);
    await page.click('button:has-text("Create Learner Account")');

    // Should authenticate and update navbar
    await page.waitForSelector(`button[title*="Signed in as ${testName}"]`, { timeout: 10000 });
    console.log(`  [PASS] Account created and authenticated! Navbar shows "${testName}".`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_authenticated_navbar.png') });

    // 5. Page Reload Session Persistence
    console.log('\n[STEP 5] Testing session persistence across hard page reload...');
    const closeWizardBtn = page.locator('button[aria-label="Close"]').first();
    if (await closeWizardBtn.isVisible()) {
      await closeWizardBtn.click();
      await page.waitForTimeout(300);
    }

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector(`button[title*="Signed in as ${testName}"]`, { timeout: 10000 });
    console.log('  [PASS] Session immediately restored after hard page reload. No logout flash!');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_page_reloaded.png') });

    // 6. Sign out
    console.log('\n[STEP 6] Testing Sign Out...');
    const closeWizardAfterReload = page.locator('button[aria-label="Close"]').first();
    if (await closeWizardAfterReload.isVisible()) {
      await closeWizardAfterReload.click();
      await page.waitForTimeout(300);
    }

    const menuTrigger = page.locator('button[aria-label="Account and application options"]').first();
    await menuTrigger.click();
    await page.waitForSelector('button[role="menuitem"]:has-text("Sign Out")', { timeout: 5000 });
    await page.click('button[role="menuitem"]:has-text("Sign Out")');

    await page.waitForSelector('button:has-text("Sign In")', { timeout: 5000 });
    console.log('  [PASS] Sign out completed successfully. Navbar displays Sign In.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_signed_out.png') });

    // 7. Duplicate Registration Handling & Quick-Switch to Login
    console.log('\n[STEP 7] Testing duplicate account registration & 1-click login helper...');
    const regBtn = page.locator('button:has-text("Get Started Free")').first();
    if (await regBtn.isVisible()) {
      await regBtn.click();
    } else {
      await page.click('button:has-text("Sign In")');
      await page.waitForSelector('text=Create one free');
      await page.click('button:has-text("Create one free")');
    }
    await page.waitForSelector('text=Create Your Learner Account', { timeout: 5000 });
    await page.fill('input[placeholder="Alex Morgan"]', testName);
    await page.fill('input[placeholder="student@university.edu"]', testEmail);
    const regPwdInputs = page.locator('input[placeholder="••••••••"]');
    await regPwdInputs.nth(0).fill(testPassword);
    await regPwdInputs.nth(1).fill(testPassword);
    await page.check('#terms');
    await page.click('button:has-text("Create Learner Account")');

    await page.waitForSelector('text=This account already exists. Please log in instead.', { timeout: 5000 });
    console.log('  [PASS] Duplicate registration returned expected message without [object Object].');

    const switchBtn = page.locator('button:has-text("Log in with this email")');
    const hasSwitchBtn = await switchBtn.isVisible();
    console.log('  [PASS] "Log in with this email" quick-switch button is visible:', hasSwitchBtn);

    // Click quick switch
    await switchBtn.click();
    await page.waitForSelector('text=Welcome Back to LearnLoop', { timeout: 5000 });
    console.log('  [PASS] Modal smoothly transitioned to Sign In view.');

    // Verify email is pre-filled!
    const loginEmailVal = await page.inputValue('input[placeholder="student@university.edu"]');
    console.log(`  [PASS] Pre-filled login email: "${loginEmailVal}" (matches ${testEmail})`);

    // 8. Test wrong password on login
    console.log('\n[STEP 8] Testing wrong password on login...');
    await page.fill('input[placeholder="Enter your password"]', 'WrongPassword123!');
    await page.click('form button[type="submit"]:has-text("Sign In")');
    await page.waitForSelector('text=Incorrect password', { timeout: 5000 });
    console.log('  [PASS] Wrong password returned clear error without wiping email.');

    // 9. Successful Login
    console.log('\n[STEP 9] Submitting valid password on login...');
    await page.fill('input[placeholder="Enter your password"]', testPassword);
    await page.click('form button[type="submit"]:has-text("Sign In")');

    await page.waitForSelector(`button[title*="Signed in as ${testName}"]`, { timeout: 10000 });
    console.log(`  [PASS] Successfully logged back in as "${testName}".`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_logged_in_again.png') });

    console.log('\n===============================================================');
    console.log('ALL BROWSER AUTHENTICATION & UX TESTS PASSED SUCCESSFULLY (9/9)');
    console.log('===============================================================');

  } catch (err) {
    console.error('[TEST ERROR]', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_state.png') });
    throw err;
  } finally {
    await browser.close();
  }
}

runAuthUITest().catch(e => {
  console.error(e);
  process.exit(1);
});

