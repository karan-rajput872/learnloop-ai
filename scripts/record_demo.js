import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const RECORDING_DIR = path.resolve('demo_assets/raw_video');
fs.mkdirSync(RECORDING_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function recordDemo() {
  console.log('======================================================================');
  console.log('LEARNLOOP AI - RECORDING HIGH-DEFINITION 1920x1080 PRODUCT DEMO');
  console.log('======================================================================');

  const browser = await chromium.launch({
    headless: false, // Windowed rendering ensures smooth 1080p canvas and CSS transitions
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
      dir: RECORDING_DIR,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  const timestamp = Date.now();
  const demoEmail = `alex.demo.${timestamp}@learnloop.ai`;
  const demoPassword = 'MasterConcepts#2026';
  const demoName = 'Alex Chen';

  try {
    // ------------------------------------------------------------------------
    // SCENE 1 (0:00 - 0:38): INTRODUCTION & BRANDING
    // ------------------------------------------------------------------------
    console.log('[SCENE 1] Loading LearnLoop AI Homepage & Syllabus Architecture...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(4000);

    // Smooth subtle showcase scrolling
    await page.evaluate(() => window.scrollBy({ top: 350, behavior: 'smooth' }));
    await sleep(6000);
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await sleep(7000);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await sleep(21400); // Pad to exact scene duration: 38.4s

    // ------------------------------------------------------------------------
    // SCENE 2 (0:38 - 1:06): REGISTRATION & AUTHENTICATION
    // ------------------------------------------------------------------------
    console.log('[SCENE 2] Demonstrating Registration & Session Security...');
    const signUpBtn = page.getByRole('button', { name: 'Sign Up' });
    await signUpBtn.click();
    await sleep(2000);

    await page.fill('input[placeholder="e.g. Alex Chen"]', demoName);
    await sleep(1500);
    await page.fill('input[placeholder="alex.chen@university.edu"]', demoEmail);
    await sleep(1500);
    await page.fill('input[placeholder="At least 8 characters"]', demoPassword);
    await sleep(1500);
    await page.fill('input[placeholder="Repeat your password"]', demoPassword);
    await sleep(1500);
    await page.check('input[type="checkbox"]');
    await sleep(2000);

    const submitRegBtn = page.getByRole('button', { name: 'Create Learner Account' });
    await submitRegBtn.click();
    await sleep(17790); // Pad to exact scene duration: 27.8s

    // ------------------------------------------------------------------------
    // SCENE 3 (1:06 - 1:46): PERSONALIZED LEARNER ONBOARDING
    // ------------------------------------------------------------------------
    console.log('[SCENE 3] Demonstrating Multi-Step Personalized Onboarding Wizard...');
    await page.waitForSelector('text=Personalize Your Learning Path', { timeout: 15000 });
    await sleep(2000);

    // Step 1: Category
    await page.click('text=College / University Student');
    await sleep(1500);
    await page.fill('input[placeholder="e.g., Stanford University"]', 'Stanford University');
    await sleep(1500);
    await page.fill('input[placeholder="e.g., Computer Science"]', 'Computer Science');
    await sleep(1500);
    await page.getByRole('button', { name: 'Continue' }).click();
    await sleep(2500);

    // Step 2: Background
    await page.click('text=1–2 years');
    await sleep(1500);
    await page.click('text=Have studied basic concepts');
    await sleep(1500);
    await page.getByRole('button', { name: 'Continue' }).click();
    await sleep(2500);

    // Step 3: Goals & Availability
    await page.click('text=Within 3 months');
    await sleep(1500);
    await page.click('text=30–60 minutes');
    await sleep(1500);
    await page.getByRole('button', { name: 'Continue' }).click();
    await sleep(2500);

    // Step 4: Self-Reported Level
    await page.click('text=Intermediate');
    await sleep(1500);
    await page.getByRole('button', { name: 'Continue' }).click();
    await sleep(2500);

    // Step 5: Preferences
    await page.click('text=Visual diagrams & memory layouts');
    await sleep(1500);
    await page.getByRole('button', { name: 'Continue' }).click();
    await sleep(2500);

    // Step 6: Review & Choice
    await page.click('text=Quick Diagnostic');
    await sleep(2000);
    const startDiagnosticBtn = page.getByRole('button', { name: 'Start Diagnostic Assessment' });
    await startDiagnosticBtn.click();
    await sleep(11300); // Pad to exact scene duration: 40.3s

    // ------------------------------------------------------------------------
    // SCENE 4 (1:46 - 2:24): DIAGNOSTIC ASSESSMENT & VERIFIED PROFICIENCY
    // ------------------------------------------------------------------------
    console.log('[SCENE 4] Demonstrating Calibrated Diagnostic Assessment...');
    await page.waitForSelector('text=DSA Knowledge Baseline Test', { timeout: 15000 });
    await sleep(2500);

    // Q1: Arrays (Option A)
    await page.click('text=1012');
    await sleep(1000);
    await page.fill('textarea[placeholder*="Explain why"]', 'Address = Base (1000) + Index (3) * 4 bytes = 1012');
    await sleep(2000);
    await page.getByRole('button', { name: 'Next Question' }).click();
    await sleep(2000);

    // Q2: Time Complexity (Option A)
    await page.click('text=O(log n)');
    await sleep(2000);
    await page.getByRole('button', { name: 'Next Question' }).click();
    await sleep(2000);

    // Q3: Space Complexity (Option A)
    await page.click('text=O(n) auxiliary space');
    await sleep(2000);
    await page.getByRole('button', { name: 'Next Question' }).click();
    await sleep(2000);

    // Q4: Linked Lists (Option A)
    await page.click('text=new_node.next = prev_node.next');
    await sleep(2000);
    await page.getByRole('button', { name: 'Next Question' }).click();
    await sleep(2000);

    // Q5: Recursion (Option A)
    await page.click('text=The function calls itself indefinitely');
    await sleep(2000);
    await page.getByRole('button', { name: 'Next Question' }).click();
    await sleep(2000);

    // Q6: Binary Trees (Option A)
    await page.click('text=Every node in the left subtree must have');
    await sleep(2000);

    // Submit Assessment
    const submitDiagBtn = page.getByRole('button', { name: 'Submit Diagnostic Assessment' });
    await submitDiagBtn.click();
    await sleep(3500);

    // Showcase Verified Proficiency Level Card
    await page.waitForSelector('text=Verified Algorithmic Proficiency Established', { timeout: 15000 });
    await sleep(10800); // Pad to exact scene duration: 37.8s

    // ------------------------------------------------------------------------
    // SCENE 5 (2:24 - 3:08): ADAPTIVE QUIZ & 7 BOUNDED AGENT TOOLS
    // ------------------------------------------------------------------------
    console.log('[SCENE 5] Demonstrating Adaptive Quiz & 7 Bounded Agent Tools...');
    await page.click('button:has-text("Adaptive Quiz")');
    await sleep(3000);

    await page.waitForSelector('text=Agent Decision Rationale', { timeout: 15000 });
    await sleep(3000);

    // Select Option A
    const optionA = page.locator('div:has-text("A")').nth(3);
    if (await optionA.isVisible()) {
      await optionA.click();
    } else {
      await page.click('.cursor-pointer');
    }
    await sleep(2000);

    await page.fill('textarea[placeholder*="Explain your thought process"]', 'Applying core algorithmic invariants to maintain structural consistency.');
    await sleep(2000);

    const submitQuizBtn = page.getByRole('button', { name: 'Submit Answer' });
    if (await submitQuizBtn.isVisible()) {
      await submitQuizBtn.click();
    }
    await sleep(4000);

    // Highlight Tool Telemetry
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
    await sleep(6000);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await sleep(24450); // Pad to exact scene duration: 44.5s

    // ------------------------------------------------------------------------
    // SCENE 6 (3:08 - 3:43): SOCRATIC AI TUTOR
    // ------------------------------------------------------------------------
    console.log('[SCENE 6] Demonstrating Socratic AI Tutor & Wispr Flow Disfluency Parsing...');
    await page.click('button:has-text("AI Tutor")');
    await sleep(3000);

    const tutorInput = page.locator('textarea[placeholder*="Ask a conceptual question"]').first();
    if (await tutorInput.isVisible()) {
      await tutorInput.fill('Can you explain why binary search does not work on a singly linked list?');
      await sleep(2000);
      await page.click('button:has-text("Send")');
      await sleep(4000);
    }

    // Showcase Socratic Quick Actions
    const analogyBtn = page.getByRole('button', { name: 'Analogy' }).first();
    if (await analogyBtn.isVisible()) {
      await analogyBtn.click();
      await sleep(4000);
    }

    const exampleBtn = page.getByRole('button', { name: 'Worked Example' }).first();
    if (await exampleBtn.isVisible()) {
      await exampleBtn.click();
      await sleep(4000);
    }
    await sleep(17660); // Pad to exact scene duration: 34.7s

    // ------------------------------------------------------------------------
    // SCENE 7 (3:43 - 4:16): CONCEPT GRAPH & SPACED REVISION
    // ------------------------------------------------------------------------
    console.log('[SCENE 7] Demonstrating Concept Graph & SM-2 Spaced Revision...');
    await page.click('button:has-text("Concept Graph")');
    await sleep(4000);

    // Select Binary Search Trees node
    const bstNode = page.locator('text=Binary Search Trees').first();
    if (await bstNode.isVisible()) {
      await bstNode.click();
      await sleep(4000);
    }

    // Navigate to Spaced Revision
    await page.click('button:has-text("Spaced Revision")');
    await sleep(4000);

    await page.evaluate(() => window.scrollBy({ top: 250, behavior: 'smooth' }));
    await sleep(4000);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await sleep(17260); // Pad to exact scene duration: 33.3s

    // ------------------------------------------------------------------------
    // SCENE 8 (4:16 - 4:44): PROGRESS DASHBOARD & CLOSING
    // ------------------------------------------------------------------------
    console.log('[SCENE 8] Demonstrating Progress Mastery & Hackathon Submission Closing...');
    await page.click('button:has-text("Dashboard")');
    await sleep(4000);

    // Open Learning Profile modal
    const profileBtn = page.getByRole('button', { name: 'Learning Profile' });
    if (await profileBtn.isVisible()) {
      await profileBtn.click();
      await sleep(5000);
      await page.keyboard.press('Escape');
      await sleep(2000);
    }

    // Scroll to show syllabus mastery breakdown
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
    await sleep(5000);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await sleep(11380); // Pad to exact scene duration: 27.4s

    console.log('\n[COMPLETE] Recording session finished successfully!');
  } catch (err) {
    console.error('Error during recording:', err);
  } finally {
    await context.close();
    await browser.close();
  }
}

recordDemo();

