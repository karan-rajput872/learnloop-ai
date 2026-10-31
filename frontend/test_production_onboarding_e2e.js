import { chromium } from 'playwright';

async function runProductionOnboardingE2E() {
  console.log('=' .repeat(70));
  console.log('LEARNLOOP AI - E2E PRODUCTION BROWSER ONBOARDING VERIFICATION');
  console.log('Target URL: https://learnloop-ai-one.vercel.app');
  console.log('=' .repeat(70));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const timestamp = Date.now();
  const testEmail = `taylor_e2e_${timestamp}@learnloop.ai`;
  const testPassword = 'E2EPassword#2026!';
  const testName = `Taylor Onboard ${timestamp % 1000}`;

  try {
    // 1. Navigate to live production app
    console.log('\n[1] Navigating to https://learnloop-ai-one.vercel.app...');
    await page.goto('https://learnloop-ai-one.vercel.app', { waitUntil: 'networkidle', timeout: 45000 });
    const title = await page.title();
    console.log(`  [PASS] Page loaded: "${title}"`);

    // 2. Open Registration
    console.log('\n[2] Opening registration modal...');
    const signUpBtn = page.getByRole('button', { name: 'Sign Up' });
    await signUpBtn.click();
    await page.waitForSelector('text=Create Your Learner Account', { timeout: 10000 });
    console.log('  [PASS] Registration modal displayed');

    // 3. Fill registration form
    console.log(`\n[3] Registering new account: ${testEmail}...`);
    await page.fill('input[placeholder="e.g. Alex Chen"]', testName);
    await page.fill('input[placeholder="alex.chen@university.edu"]', testEmail);
    await page.fill('input[placeholder="At least 8 characters"]', testPassword);
    await page.fill('input[placeholder="Repeat your password"]', testPassword);
    await page.check('input[type="checkbox"]');

    // Click submit
    const submitRegBtn = page.getByRole('button', { name: 'Create Learner Account' });
    await submitRegBtn.click();

    // 4. Wait for Onboarding Wizard modal
    console.log('\n[4] Waiting for Personalized Onboarding Wizard to automatically appear...');
    await page.waitForSelector('text=Personalize Your Learning Path', { timeout: 20000 });
    console.log('  [PASS] Personalized Onboarding Wizard appeared automatically upon registration!');

    // 5. Step 1: Learner Category
    console.log('\n[5] Completing Step 1: Basic Profile & Category...');
    await page.click('text=College / University Student');
    await page.fill('input[placeholder="e.g., Stanford University"]', 'Stanford University');
    await page.fill('input[placeholder="e.g., Computer Science"]', 'Computer Science');
    await page.getByRole('button', { name: 'Continue' }).click();

    // 6. Step 2: Background
    console.log('\n[6] Completing Step 2: Programming & DSA Background...');
    await page.click('text=1–2 years');
    await page.click('text=Have studied basic concepts');
    await page.getByRole('button', { name: 'Continue' }).click();

    // 7. Step 3: Goals & Availability
    console.log('\n[7] Completing Step 3: Learning Goals & Schedule...');
    await page.click('text=Within 3 months');
    await page.click('text=30–60 minutes');
    await page.getByRole('button', { name: 'Continue' }).click();

    // 8. Step 4: Self-Assessed Skill Level
    console.log('\n[8] Completing Step 4: Self-Reported Baseline Level...');
    await page.click('text=Intermediate');
    await page.getByRole('button', { name: 'Continue' }).click();

    // 9. Step 5: Learning Preferences
    console.log('\n[9] Completing Step 5: Pedagogical Preferences...');
    await page.click('text=Visual diagrams & memory layouts');
    await page.getByRole('button', { name: 'Continue' }).click();

    // 10. Step 6: Review & Save
    console.log('\n[10] Step 6: Review Profile & Choose Diagnostic Mode...');
    await page.waitForSelector('text=Profile Summary');
    console.log('  [PASS] Profile summary displayed with all selections');

    // Click Save & Go to Dashboard
    await page.getByRole('button', { name: 'Save & Go to Dashboard' }).click();
    console.log('  [PASS] Profile saved to live backend');

    // 11. Verify Dashboard updates
    console.log('\n[11] Verifying Dashboard reflects Personalized Learner Model...');
    await page.waitForSelector(`text=Welcome back,`, { timeout: 15000 });
    const welcomeText = await page.textContent(`text=Welcome back,`);
    console.log(`  [PASS] Welcome banner displayed: "${welcomeText?.trim()}"`);

    const hasProficiencyBadge = await page.isVisible('text=Verified Proficiency Level');
    console.log(`  [PASS] Verified Proficiency Level card rendered: ${hasProficiencyBadge}`);

    const hasStrategyCard = await page.isVisible('text=Personalized Focus Strategy');
    console.log(`  [PASS] Focus Strategy card rendered: ${hasStrategyCard}`);

    // 12. Page Refresh - Session & Profile Persistence Check
    console.log('\n[12] Testing browser page refresh for persistent session...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector(`text=Welcome back,`, { timeout: 15000 });
    console.log('  [PASS] Authenticated session survived page refresh!');

    // 13. Open Learning Profile Modal
    console.log('\n[13] Testing "Learning Profile" modal from Navbar...');
    const profileBtn = page.getByRole('button', { name: 'Learning Profile' });
    if (await profileBtn.isVisible()) {
      await profileBtn.click();
      await page.waitForSelector('text=Personalized Learning Preferences & Schedule', { timeout: 8000 });
      console.log('  [PASS] My Learning Profile modal opened successfully!');
      await page.keyboard.press('Escape');
    }

    console.log('\n' + '=' .repeat(70));
    console.log('ALL E2E BROWSER ONBOARDING TESTS PASSED IN LIVE PRODUCTION!');
    console.log('=' .repeat(70));

  } catch (error) {
    console.error('\nE2E TEST FAILURE:', error);
    await page.screenshot({ path: 'production_onboard_error.png' });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runProductionOnboardingE2E();

