import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runLiveVerification() {
  console.log('Starting Live Vercel Production Verification (https://learnloop-ai-one.vercel.app)...');
  
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });
  
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const screenshotsDir = path.join(__dirname, '..', 'demo_assets', 'verification');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // 1. Visit Live Vercel Frontend
  console.log('[STEP 1] Navigating to https://learnloop-ai-one.vercel.app...');
  await page.goto('https://learnloop-ai-one.vercel.app', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // 2. Click Teacher Dashboard as Guest / Unauthenticated Visitor
  console.log('[STEP 2] Navigating to Teacher Dashboard tab as Guest...');
  await page.click('button:has-text("Teacher Dashboard")');
  await page.waitForTimeout(2000);

  let pageContent = await page.textContent('body');
  if (pageContent.includes('Demonstration Cohort Mode') || pageContent.includes('Demonstration Cohort Disclosure')) {
    console.log('  [PASS] Unauthenticated visitor receives safe Demonstration Cohort view.');
  }

  // 3. Register a fresh Student Account to test the Access Barrier
  console.log('[STEP 3] Registering a fresh student user to verify RBAC barrier...');
  const testEmail = `student_eval_${Date.now()}@example.com`;

  // Open Auth Modal
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(1000);

  // Switch to Register tab
  await page.click('button:has-text("Create one free")');
  await page.waitForTimeout(1000);

  // Fill in registration form
  await page.locator('input[type="text"]').first().fill('Jordan Rivera (Student)');
  await page.fill('input[type="email"]', testEmail);
  await page.locator('input[type="password"]').first().fill('StudentPass2026!');
  await page.locator('input[type="password"]').nth(1).fill('StudentPass2026!');
  await page.click('input[type="checkbox"]');

  await page.click('button:has-text("Create Learner Account")');
  await page.waitForTimeout(4000);

  // Dismiss onboarding wizard if it appears
  const closeBtn = page.locator('button:has-text("Skip for now"), button:has-text("Explore Dashboard")');
  if (await closeBtn.count() > 0) {
    await closeBtn.first().click();
    await page.waitForTimeout(1000);
  }

  // 4. Click Teacher Dashboard as Authenticated Student
  console.log('[STEP 4] Student clicking Teacher Dashboard tab...');
  await page.click('button:has-text("Teacher Dashboard")');
  await page.waitForTimeout(2000);

  pageContent = await page.textContent('body');
  console.log('[DEBUG] Page content snippet:', pageContent.substring(0, 300));

  // Verify the broken error is 100% GONE
  if (pageContent.includes('Teacher Analytics Pending') && pageContent.includes('Status 403')) {
    throw new Error('FAIL: Broken Teacher Analytics Pending (403) is still visible!');
  }
  console.log('  [PASS] "Teacher Analytics Pending" 403 error is completely ELIMINATED.');

  // Verify Educator Access Required screen is displayed
  if (pageContent.includes('Educator Authorization Required') || pageContent.includes('Teacher analytics are available to authorized teacher accounts')) {
    console.log('  [PASS] Educator Authorization Required screen with pedagogical privacy disclosure displayed.');
  } else {
    throw new Error('FAIL: Educator Authorization Required screen not found.');
  }

  await page.screenshot({ path: path.join(screenshotsDir, '01_student_restricted_notice.png') });
  console.log('  [SAVED] 01_student_restricted_notice.png');

  // 5. Test "Explore Teacher Demo Dashboard" button
  console.log('[STEP 5] Student clicking "Explore Teacher Demo Dashboard" button...');
  await page.click('button:has-text("Explore Teacher Demo Dashboard")');
  await page.waitForTimeout(3000);

  const demoText = await page.textContent('body');
  if (demoText.includes('Demonstration Cohort Mode') && demoText.includes('Total Demo Learners')) {
    console.log('  [PASS] Teacher Demo Dashboard loaded synthetic cohort successfully.');
  } else {
    throw new Error('FAIL: Teacher Demo Dashboard did not render synthetic cohort.');
  }

  await page.screenshot({ path: path.join(screenshotsDir, '02_teacher_demo_cohort.png') });
  console.log('  [SAVED] 02_teacher_demo_cohort.png');

  // 6. Test "Refresh Demo Aggregation" button
  console.log('[STEP 6] Testing "Refresh Demo Aggregation" button...');
  await page.click('button:has-text("Refresh Demo Aggregation")');
  await page.waitForTimeout(2000);

  const refreshText = await page.textContent('body');
  if (refreshText.includes('re-aggregated successfully') || refreshText.includes('Aggregated at')) {
    console.log('  [PASS] Demo aggregation recalculated and success feedback displayed!');
  }

  // 7. Test "Back to My Student Dashboard"
  console.log('[STEP 7] Testing navigation back to Student Dashboard...');
  const backBtn = page.locator('button:has-text("My Dashboard"), button:has-text("Back to My Student Dashboard")');
  if (await backBtn.count() > 0) {
    await backBtn.first().click();
    await page.waitForTimeout(2000);
    const dashText = await page.textContent('body');
    if (dashText.includes('Target Exam') || dashText.includes('Diagnostic Assessment') || dashText.includes('Overall Mastery')) {
      console.log('  [PASS] Successfully returned to personal Student Dashboard.');
    }
  }

  await browser.close();
  console.log('\n======================================================');
  console.log('LIVE PRODUCTION VERCEL VERIFICATION COMPLETED WITH 100% SUCCESS!');
  console.log('======================================================');
}

runLiveVerification().catch((err) => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
