import { chromium } from 'playwright';

async function testMultiTabSync() {
  console.log('===============================================================');
  console.log('LEARNLOOP AI — MULTI-TAB SESSION SYNCHRONIZATION TEST');
  console.log('===============================================================\n');

  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch (e) {
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  
  const page1 = await context.newPage();
  const page2 = await context.newPage();

  const ts = Date.now();
  const email = `multitab_${ts}@test.edu`;
  const pwd = 'MultiTabPassword123!';
  const name = `Tab User ${ts.toString().slice(-4)}`;

  try {
    console.log('[STEP 1] Opening Tab 1 and Tab 2 at http://127.0.0.1:3000...');
    await page1.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' });
    await page2.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' });
    
    await page1.waitForSelector('text=LearnLoop AI');
    await page2.waitForSelector('text=LearnLoop AI');
    console.log('  [PASS] Both tabs loaded.');

    console.log('\n[STEP 2] Registering user in Tab 1...');
    const getStartedBtn = page1.locator('button:has-text("Get Started Free")').first();
    if (await getStartedBtn.isVisible()) {
      await getStartedBtn.click();
    } else {
      await page1.click('button:has-text("Sign In")');
      await page1.waitForSelector('text=Create one free');
      await page1.click('button:has-text("Create one free")');
    }
    await page1.waitForSelector('text=Create Your Learner Account');
    await page1.fill('input[placeholder="Alex Morgan"]', name);
    await page1.fill('input[placeholder="student@university.edu"]', email);
    const pwds = page1.locator('input[placeholder="••••••••"]');
    await pwds.nth(0).fill(pwd);
    await pwds.nth(1).fill(pwd);
    await page1.check('#terms');
    await page1.click('button:has-text("Create Learner Account")');

    await page1.waitForSelector(`button[title*="Signed in as ${name}"]`, { timeout: 10000 });
    console.log('  [PASS] Tab 1 authenticated.');

    console.log('\n[STEP 3] Verifying Tab 2 automatically synchronized authentication via BroadcastChannel...');
    await page2.waitForSelector(`button[title*="Signed in as ${name}"]`, { timeout: 10000 });
    console.log('  [PASS] Tab 2 instantly synchronized without manual reload!');

    console.log('\n[STEP 4] Logging out from Tab 1...');
    await page1.waitForTimeout(1000);
    // Dismiss wizard in Tab 1 if present
    const closeWizard = page1.locator('button[aria-label="Close"]').first();
    if (await closeWizard.isVisible()) {
      await closeWizard.click();
      await page1.waitForTimeout(500);
    } else {
      await page1.keyboard.press('Escape');
      await page1.waitForTimeout(300);
    }
    const menuTrigger = page1.locator('button[aria-label="Account and application options"]').first();
    await menuTrigger.click();
    await page1.waitForSelector('button[role="menuitem"]:has-text("Sign Out")');
    await page1.click('button[role="menuitem"]:has-text("Sign Out")');
    await page1.waitForSelector('button:has-text("Sign In")');
    console.log('  [PASS] Tab 1 signed out.');

    console.log('\n[STEP 5] Verifying Tab 2 automatically logged out via BroadcastChannel...');
    await page2.waitForSelector('button:has-text("Sign In")', { timeout: 10000 });
    console.log('  [PASS] Tab 2 instantly received LOGOUT broadcast and cleared session!');

    console.log('\n===============================================================');
    console.log('MULTI-TAB SYNCHRONIZATION TESTS PASSED COMPLETELY (5/5)');
    console.log('===============================================================');

  } finally {
    await browser.close();
  }
}

testMultiTabSync().catch(e => {
  console.error(e);
  process.exit(1);
});

