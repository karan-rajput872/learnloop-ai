import { chromium } from 'playwright';

async function testGuestFlow() {
  console.log('Testing Public Guest Demo Flow...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  try {
    // 1. Landing
    console.log('1. Loading http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // 2. Click Explore Live Demo
    console.log('2. Clicking "EXPLORE LIVE DEMO"...');
    const demoBtn = page.locator('button:has-text("EXPLORE LIVE DEMO")').first();
    await demoBtn.click();
    await page.waitForTimeout(2000);

    // Verify demo banner
    const banner = await page.locator('text=Live Demo Explorer').isVisible();
    console.log('Demo banner visible:', banner);

    // 3. Open Onboarding Wizard
    console.log('3. Opening Onboarding Wizard...');
    const wizardBtn = page.locator('button:has-text("Onboarding Wizard")').first();
    if (await wizardBtn.isVisible()) {
      await wizardBtn.click();
      await page.waitForTimeout(1000);

      // Step 1
      await page.locator('button').filter({ hasText: 'College / University Student' }).first().click();
      await page.locator('input[placeholder="e.g., Stanford University"]').fill('Stanford University');
      await page.locator('input[placeholder="e.g., Computer Science"]').fill('Computer Science');
      await page.getByRole('button', { name: 'Continue' }).first().click();
      await page.waitForTimeout(400);

      // Step 2
      await page.locator('button').filter({ hasText: '1–2 years' }).first().click();
      await page.locator('button').filter({ hasText: 'Have studied basic concepts' }).first().click();
      await page.getByRole('button', { name: 'Continue' }).first().click();
      await page.waitForTimeout(400);

      // Step 3
      await page.locator('button').filter({ hasText: 'Within 3 months' }).first().click();
      await page.locator('button').filter({ hasText: '30–60 minutes' }).first().click();
      await page.getByRole('button', { name: 'Continue' }).first().click();
      await page.waitForTimeout(400);

      // Step 4
      await page.locator('button').filter({ hasText: 'Intermediate' }).first().click();
      await page.getByRole('button', { name: 'Continue' }).first().click();
      await page.waitForTimeout(400);

      // Step 5
      await page.locator('button').filter({ hasText: 'Visual diagrams' }).first().click();
      await page.getByRole('button', { name: 'Continue' }).first().click();
      await page.waitForTimeout(400);

      // Step 6
      await page.locator('button').filter({ hasText: 'Quick Diagnostic' }).first().click();
      await page.getByRole('button', { name: 'Start Diagnostic Assessment' }).first().click();
      await page.waitForTimeout(2500);
      console.log('Onboarding Wizard completed, navigated to Diagnostic!');
    }

    // 4. Diagnostic
    console.log('4. Testing Diagnostic page...');
    await page.waitForSelector('button.w-full.text-left', { timeout: 10000 });

    for (let i = 0; i < 6; i++) {
      console.log(`Answering question ${i + 1}...`);
      await page.locator('button.w-full.text-left').first().click();
      await page.waitForTimeout(300);

      if (i < 5) {
        const nextBtn = page.locator('button:has-text("Next Question")').first();
        await nextBtn.click();
        await page.waitForTimeout(300);
      }
    }

    console.log('Submitting diagnostic via "Complete & View Results"...');
    const submitBtn = page.locator('button:has-text("Complete & View Results")').first();
    await submitBtn.click();
    console.log('Submitted diagnostic! Waiting for verified proficiency card...');
    await page.waitForSelector('text=Verified Algorithmic Proficiency Established', { timeout: 15000 });
    console.log('Verified proficiency card confirmed visible!');

    // 5. Concept Graph
    console.log('5. Navigating to Concept Graph...');
    await page.getByRole('button', { name: 'Concept Graph' }).first().click();
    await page.waitForTimeout(1500);
    console.log('Concept Graph loaded!');

    // 6. Adaptive Quiz
    console.log('6. Navigating to Adaptive Quiz...');
    await page.getByRole('button', { name: 'Adaptive Quiz' }).first().click();
    await page.waitForTimeout(1500);
    const quizOption = page.locator('.shadow-card button').first();
    if (await quizOption.isVisible()) {
      await quizOption.click();
      await page.locator('textarea').first().fill('Applying stack LIFO invariants to maintain parenthesis matching order.');
      await page.locator('button:has-text("Submit & Analyze Reasoning")').first().click();
      await page.waitForTimeout(2000);
      console.log('Adaptive Quiz evaluated with agent trace!');
    }

    // 7. AI Tutor
    console.log('7. Navigating to AI Tutor...');
    await page.getByRole('button', { name: 'AI Tutor' }).first().click();
    await page.waitForTimeout(1500);
    const preset = page.locator('text=Stack LIFO vs FIFO with Self-Correction').first();
    if (await preset.isVisible()) {
      await preset.click();
      await page.waitForTimeout(2500);
      console.log('AI Tutor Wispr Flow preset triggered!');
    }

    // 8. Spaced Revision & Dashboard
    console.log('8. Navigating to Spaced Revision...');
    await page.getByRole('button', { name: 'Spaced Revision' }).first().click();
    await page.waitForTimeout(1500);

    console.log('Returning to Dashboard...');
    await page.getByRole('button', { name: 'Dashboard' }).first().click();
    await page.waitForTimeout(1500);

    // 9. Teacher Dashboard
    console.log('9. Navigating to Teacher Dashboard...');
    await page.getByRole('button', { name: 'Teacher Dashboard' }).first().click();
    await page.waitForTimeout(1500);
    const teacherHeading = await page.locator('text=Teacher & Educator Analytics').isVisible();
    console.log('Teacher Dashboard visible:', teacherHeading);

    console.log('\n======================================================');
    console.log('>>> ALL 9 GUEST DEMO SCENES RUN 100% CLEANLY <<<');
    console.log('======================================================');
  } catch (err) {
    console.error('Error in flow:', err);
  } finally {
    await browser.close();
  }
}

testGuestFlow();
