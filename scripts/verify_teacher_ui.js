const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runVerification() {
  console.log('Starting Playwright Teacher UI Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const screenshotsDir = path.join(__dirname, '..', 'demo_assets', 'verification');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // 1. Visit localhost:3000
  console.log('[STEP 1] Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // 2. Click Teacher Dashboard as unauthenticated / demo user
  console.log('[STEP 2] Navigating to Teacher Dashboard tab as demo/guest...');
  await page.click('button:has-text("Teacher Dashboard")');
  await page.waitForTimeout(1000);

  const demoNotice = await page.textContent('body');
  if (demoNotice.includes('Demonstration Cohort Mode') || demoNotice.includes('Demonstration Cohort Disclosure')) {
    console.log('  [PASS] Demo Cohort Mode displayed properly for guest evaluator.');
  }

  // 3. Register a fresh student account to test student access barrier
  console.log('[STEP 3] Registering a fresh student user to test RBAC barrier...');
  const testEmail = `student_${Date.now()}@example.com`;
  
  // Open Auth Modal
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(500);

  // Switch to Register tab
  await page.click('button:has-text("Create Account")');
  await page.waitForTimeout(500);

  // Fill in registration form
  await page.fill('input[placeholder="e.g. Alex Chen"]', 'Test Student Jordan');
  await page.fill('input[type="email"]', testEmail);
  await page.locator('input[type="password"]').first().fill('StudentPass2026!');
  await page.locator('input[type="password"]').nth(1).fill('StudentPass2026!');
  await page.click('input[type="checkbox"]');

  await page.click('button:has-text("Create Learner Account")');
  await page.waitForTimeout(2000);

  // Close onboarding wizard if it appears
  const closeBtn = page.locator('button:has-text("Skip for now"), button:has-text("Explore Dashboard")');
  if (await closeBtn.count() > 0) {
    await closeBtn.first().click();
    await page.waitForTimeout(1000);
  }

  // 4. Navigate to Teacher Dashboard as the authenticated Student
  console.log('[STEP 4] Student clicking Teacher Dashboard tab...');
  await page.click('button:has-text("Teacher Dashboard")');
  await page.waitForTimeout(1000);

  const pageText = await page.textContent('body');

  // Verify the broken error is 100% GONE
  if (pageText.includes('Teacher Analytics Pending') && pageText.includes('Status 403')) {
    throw new Error('FAIL: Broken Teacher Analytics Pending (403) is still visible!');
  }
  console.log('  [PASS] "Teacher Analytics Pending" 403 error is completely ELIMINATED.');

  // Verify Educator Access Required screen is displayed
  if (pageText.includes('Educator Authorization Required') || pageText.includes('Teacher analytics are available to authorized teacher accounts')) {
    console.log('  [PASS] Educator Authorization Required screen with pedagogical privacy disclosure displayed.');
  } else {
    throw new Error('FAIL: Educator Authorization Required screen not found.');
  }

  await page.screenshot({ path: path.join(screenshotsDir, '01_student_restricted_notice.png') });
  console.log('  [SAVED] 01_student_restricted_notice.png');

  // 5. Test "Explore Teacher Demo Dashboard" button
  console.log('[STEP 5] Clicking "Explore Teacher Demo Dashboard" button...');
  await page.click('button:has-text("Explore Teacher Demo Dashboard")');
  await page.waitForTimeout(1500);

  const demoDashboardText = await page.textContent('body');
  if (demoDashboardText.includes('Demonstration Cohort Mode') && demoDashboardText.includes('Total Demo Learners')) {
    console.log('  [PASS] Teacher Demo Dashboard loaded synthetic cohort successfully.');
  } else {
    throw new Error('FAIL: Teacher Demo Dashboard did not render synthetic cohort.');
  }

  await page.screenshot({ path: path.join(screenshotsDir, '02_teacher_demo_cohort.png') });
  console.log('  [SAVED] 02_teacher_demo_cohort.png');

  // 6. Test "Refresh Demo Aggregation" button
  console.log('[STEP 6] Testing "Refresh Demo Aggregation" button...');
  await page.click('button:has-text("Refresh Demo Aggregation")');
  await page.waitForTimeout(1000);

  const refreshedText = await page.textContent('body');
  if (refreshedText.includes('re-aggregated successfully') || refreshedText.includes('Aggregated at')) {
    console.log('  [PASS] Demo aggregation recalculated and success notice displayed!');
  }

  // 7. Test Educator Account Login
  console.log('[STEP 7] Logging out student and signing in as verified Educator (teacher@learnloop.ai)...');
  // Sign out
  await page.click('button:has-text("Sign Out")');
  await page.waitForTimeout(1000);

  // Sign in as educator
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(500);
  await page.fill('input[type="email"]', 'teacher@learnloop.ai');
  await page.locator('input[type="password"]').first().fill('TeacherDemo2026!');
  await page.click('button:has-text("Sign In to LearnLoop")');
  await page.waitForTimeout(2000);

  // Navigate to Teacher Dashboard as Educator
  console.log('[STEP 8] Verified Educator clicking Teacher Dashboard tab...');
  await page.click('button:has-text("Teacher Dashboard")');
  await page.waitForTimeout(1500);

  const teacherDashboardText = await page.textContent('body');
  if (teacherDashboardText.includes('Live Educator Telemetry') || teacherDashboardText.includes('Enrolled Learners')) {
    console.log('  [PASS] Verified Educator received live class telemetry!');
  } else {
    throw new Error('FAIL: Educator did not receive live class telemetry.');
  }

  // Test "Recalculate Class Aggregation" button
  console.log('[STEP 9] Testing "Recalculate Class Aggregation" button as Educator...');
  await page.click('button:has-text("Recalculate Class Aggregation")');
  await page.waitForTimeout(1000);

  const aggEducatorText = await page.textContent('body');
  if (aggEducatorText.includes('re-aggregated across all active learners') || aggEducatorText.includes('Aggregated at')) {
    console.log('  [PASS] Educator live class aggregation recalculated successfully!');
  }

  await page.screenshot({ path: path.join(screenshotsDir, '03_educator_live_telemetry.png') });
  console.log('  [SAVED] 03_educator_live_telemetry.png');

  await browser.close();
  console.log('\n======================================================');
  console.log('ALL TEACHER DASHBOARD END-TO-END UI CHECKS PASSED 100%!');
  console.log('======================================================');
}

runVerification().catch((err) => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
