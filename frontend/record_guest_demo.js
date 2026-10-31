import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const RAW_VIDEO_DIR = path.resolve('../demo_assets/final/raw_video');
const SCREENSHOT_DIR = path.resolve('../demo_assets/final/screenshots');

fs.mkdirSync(RAW_VIDEO_DIR, { recursive: true });
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function safeClick(page, selector, timeout = 5000) {
  try {
    const el = page.locator(selector).first();
    await el.waitFor({ state: 'visible', timeout });
    await el.click();
    return true;
  } catch (err) {
    console.warn(`[safeClick skipped] ${selector}:`, err.message);
    return false;
  }
}

async function safeFill(page, selector, text, timeout = 5000) {
  try {
    const el = page.locator(selector).first();
    await el.waitFor({ state: 'visible', timeout });
    await el.fill(text);
    return true;
  } catch (err) {
    console.warn(`[safeFill skipped] ${selector}:`, err.message);
    return false;
  }
}

// Exact scene durations from neural narration synthesis (scene_durations.json)
const SCENE_TARGETS = {
  scene_01: 27.55,
  scene_02: 28.82,
  scene_03: 25.80,
  scene_04: 23.52,
  scene_05: 28.06,
  scene_06: 31.97,
  scene_07: 30.67,
  scene_08: 25.94,
  scene_09: 18.02
};

async function runScene(sceneId, title, page, actionFn) {
  const targetSeconds = SCENE_TARGETS[sceneId];
  console.log(`\n======================================================================`);
  console.log(`[${sceneId.toUpperCase()}] ${title} (Target: ${targetSeconds}s)`);
  console.log(`======================================================================`);
  const t0 = Date.now();

  try {
    await actionFn();
  } catch (err) {
    console.error(`Error in ${sceneId}:`, err);
  }

  const elapsed = (Date.now() - t0) / 1000;
  const remaining = Math.max(0, targetSeconds - elapsed);
  console.log(`[${sceneId}] Actions completed in ${elapsed.toFixed(2)}s. Synchronizing for remaining ${remaining.toFixed(2)}s...`);

  if (remaining > 0) {
    await sleep(Math.round(remaining * 1000));
  }
  const total = (Date.now() - t0) / 1000;
  console.log(`[${sceneId}] Scene finished in ${total.toFixed(2)}s.`);
}

async function recordGuestDemo() {
  console.log('======================================================================');
  console.log('LEARNLOOP AI — OFFICIAL HACKATHON DEMO RECORDING (PUBLIC GUEST MODE)');
  console.log('Product Space × Wispr Flow Agentic AI Hackathon ’26 — Challenge 02');
  console.log('Target Duration: ~4:00 (240.35s) | 1920x1080 @ 30 FPS');
  console.log('======================================================================\n');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: [
      '--window-size=1920,1080',
      '--hide-scrollbars',
      '--disable-infobars',
      '--no-default-browser-check'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: RAW_VIDEO_DIR,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();
  const startTime = Date.now();

  try {
    // ========================================================================
    // SCENE 1 (27.55s): PRODUCT INTRODUCTION & PROBLEM SPACE
    // ========================================================================
    await runScene('scene_01', 'Product Introduction & Problem Space', page, async () => {
      console.log('Loading LearnLoop AI Landing Page...');
      await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(2500);

      // Smooth showcase scrolling down to DSA concepts syllabus
      console.log('Highlighting 12-Concept DSA Knowledge Architecture...');
      await page.evaluate(() => window.scrollBy({ top: 380, behavior: 'smooth' }));
      await sleep(6500);

      await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
      await sleep(6500);

      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      await sleep(2000);

      const shotPath = path.join(SCREENSHOT_DIR, 'scene_01_landing_hero.png');
      await page.screenshot({ path: shotPath });
      console.log(`Screenshot captured: ${shotPath}`);
    });

    // ========================================================================
    // SCENE 2 (28.82s): LANDING PAGE & INSTANT GUEST DEMO ACCESS
    // ========================================================================
    await runScene('scene_02', 'Landing Page & Instant Guest Demo Access', page, async () => {
      console.log('Clicking "EXPLORE LIVE DEMO" for instant zero-auth access...');
      const demoBtn = page.locator('button:has-text("EXPLORE LIVE DEMO")').first();
      await demoBtn.click();
      await sleep(2000);

      // Live Demo Explorer Banner is visible
      await page.waitForSelector('text=Live Demo Explorer', { timeout: 10000 });
      console.log('Demo Mode active! Inspecting isolated pre-populated progress...');
      await sleep(2000);

      // Scroll to view pre-populated mastery cards (38.5% overall, Arrays 80%, Stacks 40%)
      await page.evaluate(() => window.scrollBy({ top: 420, behavior: 'smooth' }));
      await sleep(5500);

      // Scroll to view weak topics and revision queue
      await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
      await sleep(5500);

      // Scroll back up to the Live Demo Explorer banner
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      await sleep(2000);

      const shotPath = path.join(SCREENSHOT_DIR, 'scene_02_guest_demo_dashboard.png');
      await page.screenshot({ path: shotPath });
      console.log(`Screenshot captured: ${shotPath}`);
    });

    // ========================================================================
    // SCENE 3 (25.80s): PERSONALIZED LEARNER ONBOARDING WIZARD
    // ========================================================================
    await runScene('scene_03', 'Personalized Learner Onboarding Wizard', page, async () => {
      console.log('Opening Onboarding Wizard from Demo Explorer Banner...');
      await safeClick(page, 'button:has-text("Onboarding Wizard")');
      await sleep(1500);

      // Step 1: Category & Academic Profile
      console.log('Wizard Step 1: Category & Education...');
      await page.locator('button').filter({ hasText: 'College / University Student' }).first().click();
      await sleep(400);
      await page.locator('input[placeholder="e.g., Stanford University"]').fill('Stanford University');
      await sleep(300);
      await page.locator('input[placeholder="e.g., Computer Science"]').fill('Computer Science');
      await sleep(400);
      await page.getByRole('button', { name: 'Continue' }).first().click();
      await sleep(1200);

      // Step 2: Experience & Topics
      console.log('Wizard Step 2: DSA Experience...');
      await page.locator('button').filter({ hasText: '1–2 years' }).first().click();
      await sleep(400);
      await page.locator('button').filter({ hasText: 'Have studied basic concepts' }).first().click();
      await sleep(400);
      await page.getByRole('button', { name: 'Continue' }).first().click();
      await sleep(1200);

      // Step 3: Goals & Timeline
      console.log('Wizard Step 3: Target Timeline & Availability...');
      await page.locator('button').filter({ hasText: 'Within 3 months' }).first().click();
      await sleep(400);
      await page.locator('button').filter({ hasText: '30–60 minutes' }).first().click();
      await sleep(400);
      await page.getByRole('button', { name: 'Continue' }).first().click();
      await sleep(1200);

      // Step 4: Self-Assessed Skill Level
      console.log('Wizard Step 4: Skill Level...');
      await page.locator('button').filter({ hasText: 'Intermediate' }).first().click();
      await sleep(400);
      await page.getByRole('button', { name: 'Continue' }).first().click();
      await sleep(1200);

      // Step 5: Learning Preferences
      console.log('Wizard Step 5: Visual Preferences...');
      await page.locator('button').filter({ hasText: 'Visual diagrams' }).first().click();
      await sleep(400);
      const shotPath = path.join(SCREENSHOT_DIR, 'scene_03_onboarding_wizard.png');
      await page.screenshot({ path: shotPath });
      console.log(`Screenshot captured: ${shotPath}`);

      await page.getByRole('button', { name: 'Continue' }).first().click();
      await sleep(1200);

      // Step 6: Mode Selection & Launch
      console.log('Wizard Step 6: Quick Diagnostic Mode...');
      await page.locator('button').filter({ hasText: 'Quick Diagnostic' }).first().click();
      await sleep(600);
      await page.getByRole('button', { name: 'Start Diagnostic Assessment' }).first().click();
      await sleep(2000);
    });

    // ========================================================================
    // SCENE 4 (23.52s): DIAGNOSTIC ASSESSMENT & VERIFIED SKILL LEVEL
    // ========================================================================
    await runScene('scene_04', 'Diagnostic Assessment & Verified Skill Level', page, async () => {
      console.log('Waiting for Diagnostic Question interface...');
      await page.waitForSelector('button.w-full.text-left', { timeout: 10000 });
      await sleep(1000);

      // Answer 6 questions efficiently
      for (let i = 0; i < 6; i++) {
        console.log(`Answering Question ${i + 1} of 6...`);
        await page.locator('button.w-full.text-left').first().click();
        await sleep(400);

        if (i < 5) {
          const nextBtn = page.locator('button:has-text("Next Question")').first();
          await nextBtn.click();
          await sleep(500);
        }
      }

      console.log('Submitting diagnostic via "Complete & View Results"...');
      const submitBtn = page.locator('button:has-text("Complete & View Results")').first();
      await submitBtn.click();

      // Wait for Verified Proficiency Card
      await page.waitForSelector('text=Verified Algorithmic Proficiency Established', { timeout: 15000 });
      console.log('Verified Algorithmic Proficiency card rendered!');
      await sleep(2500);

      const shotPath = path.join(SCREENSHOT_DIR, 'scene_04_diagnostic_verified_proficiency.png');
      await page.screenshot({ path: shotPath });
      console.log(`Screenshot captured: ${shotPath}`);
    });

    // ========================================================================
    // SCENE 5 (28.06s): DSA CONCEPT GRAPH & ADAPTIVE LEARNING
    // ========================================================================
    await runScene('scene_05', 'DSA Concept Graph & Adaptive Learning', page, async () => {
      console.log('Navigating to Concept Graph tab...');
      await page.getByRole('button', { name: 'Concept Graph' }).first().click();
      await sleep(2500);

      console.log('Highlighting 12-concept prerequisite DAG structure...');
      await page.evaluate(() => window.scrollBy({ top: 200, behavior: 'smooth' }));
      await sleep(5000);

      // Click on interactive nodes or cards
      const nodeEl = page.locator('text=Arrays').first();
      if (await nodeEl.isVisible()) {
        await nodeEl.click();
        await sleep(3500);
      }

      const stackEl = page.locator('text=Stacks').first();
      if (await stackEl.isVisible()) {
        await stackEl.click();
        await sleep(3500);
      }

      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      await sleep(2000);

      const shotPath = path.join(SCREENSHOT_DIR, 'scene_05_concept_knowledge_dag.png');
      await page.screenshot({ path: shotPath });
      console.log(`Screenshot captured: ${shotPath}`);
    });

    // ========================================================================
    // SCENE 6 (31.97s): ADAPTIVE QUIZ & 7 BOUNDED AGENT TOOLS
    // ========================================================================
    await runScene('scene_06', 'Adaptive Quiz & 7 Bounded Agent Tools', page, async () => {
      console.log('Navigating to Adaptive Quiz tab...');
      await page.getByRole('button', { name: 'Adaptive Quiz' }).first().click();
      await sleep(2500);

      // Select answer choice
      console.log('Selecting answer choice...');
      await page.locator('.shadow-card button').first().click();
      await sleep(800);

      // Type student reasoning to exercise pedagogical model
      console.log('Providing student reasoning...');
      await safeFill(
        page,
        'textarea',
        'Applying stack LIFO invariants to verify bracket ordering and maintain balanced delimiters.'
      );
      await sleep(1500);

      // Submit and trigger 7 bounded agent tools
      console.log('Submitting & analyzing reasoning with 7 agent tools...');
      await page.locator('button:has-text("Submit & Analyze Reasoning")').first().click();
      await sleep(3000);

      // Scroll to showcase live Agent Execution Trace
      console.log('Inspecting Bounded Agent Execution Trace...');
      await page.evaluate(() => window.scrollBy({ top: 450, behavior: 'smooth' }));
      await sleep(7000);

      const shotPath = path.join(SCREENSHOT_DIR, 'scene_06_agentic_quiz_execution_trace.png');
      await page.screenshot({ path: shotPath });
      console.log(`Screenshot captured: ${shotPath}`);
    });

    // ========================================================================
    // SCENE 7 (30.67s): SOCRATIC AI TUTOR & WISPR FLOW VOICE INTEGRATION
    // ========================================================================
    await runScene('scene_07', 'Socratic AI Tutor & Wispr Flow Voice Integration', page, async () => {
      console.log('Navigating to AI Tutor tab...');
      await page.getByRole('button', { name: 'AI Tutor' }).first().click();
      await sleep(2500);

      // Trigger Wispr Flow voice preset
      console.log('Activating Wispr Flow conversational speech preset...');
      const preset = page.locator('text=Stack LIFO vs FIFO with Self-Correction').first();
      if (await preset.isVisible()) {
        await preset.click();
        await sleep(3500);
      }

      // Scroll down to showcase speech cleanup & Socratic feedback
      console.log('Demonstrating speech cleanup (fillers, corrections, digressions)...');
      await page.evaluate(() => window.scrollBy({ top: 350, behavior: 'smooth' }));
      await sleep(6000);

      // Trigger Socratic quick action
      const analogyBtn = page.locator('button:has-text("Give me an Analogy")').first();
      if (await analogyBtn.isVisible()) {
        await analogyBtn.click();
        await sleep(4000);
      }

      const shotPath = path.join(SCREENSHOT_DIR, 'scene_07_ai_tutor_wispr_flow.png');
      await page.screenshot({ path: shotPath });
      console.log(`Screenshot captured: ${shotPath}`);
    });

    // ========================================================================
    // SCENE 8 (25.94s): SPACED REPETITION & PROGRESS DASHBOARD
    // ========================================================================
    await runScene('scene_08', 'Spaced Repetition & Progress Dashboard', page, async () => {
      console.log('Navigating to Spaced Revision tab...');
      await page.getByRole('button', { name: 'Spaced Revision' }).first().click();
      await sleep(3000);

      console.log('Demonstrating SuperMemo SM-2 spaced repetition queue...');
      await page.evaluate(() => window.scrollBy({ top: 250, behavior: 'smooth' }));
      await sleep(4000);

      // Return to Dashboard
      console.log('Returning to Dashboard...');
      await page.getByRole('button', { name: 'Dashboard' }).first().click();
      await sleep(2500);

      // Open Learning Profile modal
      console.log('Opening Personalized Learning Profile...');
      const profileBtn = page.getByRole('button', { name: 'Learning Profile' }).first();
      if (await profileBtn.isVisible()) {
        await profileBtn.click();
        await sleep(3000);
        const shotPath = path.join(SCREENSHOT_DIR, 'scene_08_spaced_revision_and_profile.png');
        await page.screenshot({ path: shotPath });
        console.log(`Screenshot captured: ${shotPath}`);

        // Close the modal cleanly via the close button
        const closeBtn = page.locator('button[aria-label="Close"]').first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
        } else {
          await page.keyboard.press('Escape');
        }
        await sleep(1500);
      }
    });

    // ========================================================================
    // SCENE 9 (18.02s): TEACHER ANALYTICS DASHBOARD & CLOSING
    // ========================================================================
    await runScene('scene_09', 'Teacher Analytics Dashboard & Closing', page, async () => {
      // Ensure no modal backdrop is blocking
      const modalClose = page.locator('button[aria-label="Close"]').first();
      if (await modalClose.isVisible()) {
        await modalClose.click();
        await sleep(500);
      }

      console.log('Navigating to Teacher Dashboard tab...');
      await page.getByRole('button', { name: 'Teacher Dashboard' }).first().click();
      await sleep(2500);

      console.log('Showcasing Class-Wide Analytics & Intervention Queue...');
      await page.evaluate(() => window.scrollBy({ top: 320, behavior: 'smooth' }));
      await sleep(4500);

      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      await sleep(2500);

      const shotPath = path.join(SCREENSHOT_DIR, 'scene_09_teacher_dashboard_closing.png');
      await page.screenshot({ path: shotPath });
      console.log(`Screenshot captured: ${shotPath}`);
    });

    console.log('\n======================================================================');
    console.log('ALL 9 SCENES RECORDED SUCCESSFULLY!');
    const totalDuration = (Date.now() - startTime) / 1000;
    console.log(`Total Recording Duration: ${totalDuration.toFixed(2)}s (~${(totalDuration / 60).toFixed(2)} mins)`);
    console.log('======================================================================\n');

  } catch (err) {
    console.error('Fatal recording error:', err);
  } finally {
    // Closing context finalizes and flushes the raw webm video
    await page.close();
    await context.close();
    await browser.close();
    console.log('Browser closed and raw video stream finalized.');
  }
}

recordGuestDemo();
