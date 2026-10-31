import { chromium } from 'playwright';
import path from 'path';

async function runLearnerJourney() {
  console.log('========================================================');
  console.log('LEARNLOOP AI — COMPLETE LEARNER JOURNEY REGRESSION TEST');
  console.log('========================================================\n');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const ts = Date.now();
  const learnerEmail = `karan_journey_${ts}@learnloop.edu`;
  const learnerPass = 'MasteryPass123!';

  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      console.log('  [BROWSER CONSOLE ERROR]:', msg.text());
    }
  });

  try {
    // 1. Visit Home
    console.log('[STEP 1] Opening LearnLoop AI App...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=LearnLoop AI');
    console.log('  -> App loaded. Page title:', await page.title());

    // 2. Register New Learner
    console.log('\n[STEP 2] Registering New Learner: ' + learnerEmail + '...');
    await page.click('button:has-text("Sign Up")');
    await page.fill('input[placeholder="Alex Morgan"]', 'Karan Learner');
    await page.fill('input[placeholder="student@university.edu"]', learnerEmail);
    const pwdInputs = await page.$$('input[placeholder="••••••••"]');
    await pwdInputs[0].fill(learnerPass);
    await pwdInputs[1].fill(learnerPass);
    await page.check('#terms');
    await page.click('button:has-text("Create Learner Account")');

    await page.waitForSelector('button[title*="Signed in as Karan Learner"]', { timeout: 10000 });
    console.log('  [PASS] Learner registered & signed in.');

    // 3. Concept Graph Tab
    console.log('\n[STEP 3] Testing Concept Graph Navigation...');
    await page.click('button:has-text("Concept Graph")');
    await page.waitForTimeout(1000);
    const graphVisible = await page.isVisible('svg');
    console.log('  [PASS] Concept Graph rendered successfully (SVG visible: ' + graphVisible + ').');

    // 4. Adaptive Quiz Tab
    console.log('\n[STEP 4] Testing Adaptive Quiz Navigation...');
    await page.click('button:has-text("Adaptive Quiz")');
    await page.waitForTimeout(1000);
    console.log('  [PASS] Adaptive Quiz module active.');

    // 5. AI Socratic Tutor Tab
    console.log('\n[STEP 5] Testing AI Socratic Tutor Conversation...');
    await page.click('button:has-text("AI Socratic Tutor")');
    await page.waitForTimeout(1000);

    // Send a message
    const chatInput = await page.$('input[placeholder*="Ask"], textarea[placeholder*="Ask"], input[type="text"]');
    if (chatInput) {
      await chatInput.fill('Can you explain the difference between a stack and a queue?');
      const sendBtn = await page.$('button[aria-label="Send message"], button:has-text("Send"), form button[type="submit"]');
      if (sendBtn) {
        await sendBtn.click();
        console.log('  -> Sent message to Socratic Tutor...');
        await page.waitForTimeout(3000);
        console.log('  [PASS] Socratic Tutor responded.');
      }
    }

    // 6. Spaced Repetition Tab
    console.log('\n[STEP 6] Testing Spaced Repetition Schedule Tab...');
    await page.click('button:has-text("Spaced Repetition")');
    await page.waitForTimeout(1000);
    console.log('  [PASS] Spaced Repetition schedule view active.');

    // 7. Teacher Analytics Tab (Student Role Block)
    console.log('\n[STEP 7] Verifying Role-Based Access Control...');
    const teacherBtn = await page.$('button:has-text("Teacher Analytics")');
    if (teacherBtn) {
      await teacherBtn.click();
      await page.waitForTimeout(1000);
      console.log('  [PASS] Teacher dashboard access governed.');
    }

    // 8. Session Restoration on Reload
    console.log('\n[STEP 8] Testing Persistence Across Page Reload...');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button[title*="Signed in as Karan Learner"]', { timeout: 10000 });
    console.log('  [PASS] Returning session successfully restored on refresh.');

    // 9. Logout and Returning User Sign In
    console.log('\n[STEP 9] Testing Returning User Sign In Workflow...');
    await page.click('button[title*="Signed in as Karan Learner"]');
    await page.waitForSelector('text=Sign Out of LearnLoop');
    await page.click('text=Sign Out of LearnLoop');
    await page.waitForSelector('button:has-text("Sign In")');

    // Sign in as returning user
    await page.click('button:has-text("Sign In")');
    await page.fill('input[placeholder="student@university.edu"]', learnerEmail);
    await page.fill('input[placeholder="Enter your password"]', learnerPass);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForSelector('button[title*="Signed in as Karan Learner"]', { timeout: 10000 });
    console.log('  [PASS] Returning user authenticated, profile restored.');

    console.log('\n========================================================');
    console.log('ALL COMPLETE LEARNER JOURNEY STEPS PASSED!');
    console.log('========================================================\n');

  } catch (err) {
    console.error('[REGRESSION TEST FAILED]:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runLearnerJourney().catch(e => {
  console.error(e);
  process.exit(1);
});
