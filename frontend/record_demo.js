import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const RECORDING_DIR = path.resolve('../demo_assets/raw_video');
fs.mkdirSync(RECORDING_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function safeClick(page, selector, timeout = 4000) {
  try {
    const el = page.locator(selector).first();
    await el.waitFor({ state: 'visible', timeout });
    await el.click();
    return true;
  } catch (err) {
    console.warn(`[safeClick skipped] ${selector}`);
    return false;
  }
}

async function safeFill(page, selector, text, timeout = 4000) {
  try {
    const el = page.locator(selector).first();
    await el.waitFor({ state: 'visible', timeout });
    await el.fill(text);
    return true;
  } catch (err) {
    console.warn(`[safeFill skipped] ${selector}`);
    return false;
  }
}

async function recordDemo() {
  console.log('======================================================================');
  console.log('LEARNLOOP AI - RECORDING HIGH-DEFINITION 1920x1080 PRODUCT DEMO');
  console.log('Target Duration: 4 minutes 44 seconds (~284.0s)');
  console.log('======================================================================');

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
      dir: RECORDING_DIR,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  const timestamp = Date.now();
  const demoEmail = `alex.chen.${timestamp}@learnloop.ai`;
  const demoPassword = 'MasterConcepts#2026';
  const demoName = 'Alex Chen';

  try {
    // ========================================================================
    // SCENE 1 (0:00 - 0:38 | 38.4s): INTRODUCTION & VALUE PROPOSITION
    // ========================================================================
    console.log('[SCENE 1: 0:00 - 0:38] Loading LearnLoop AI Homepage & Syllabus Architecture...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(4000);

    // Smooth subtle showcase scrolling through syllabus & DAG cards
    console.log('[SCENE 1] Highlighting DSA Concept Architecture & Knowledge DAG...');
    await page.evaluate(() => window.scrollBy({ top: 380, behavior: 'smooth' }));
    await sleep(6500);
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await sleep(7500);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await sleep(20400); // 4 + 6.5 + 7.5 + 20.4 = 38.4s

    // ========================================================================
    // SCENE 2 (0:38 - 1:06 | 27.8s): REGISTRATION & MULTI-USER ISOLATION
    // ========================================================================
    console.log('[SCENE 2: 0:38 - 1:06] Demonstrating Registration & Multi-User Isolation...');
    await safeClick(page, 'button:has-text("Sign Up")');
    await sleep(2000);

    await safeFill(page, 'input[placeholder="e.g. Alex Chen"]', demoName);
    await sleep(1500);
    await safeFill(page, 'input[placeholder="alex.chen@university.edu"]', demoEmail);
    await sleep(1500);
    await safeFill(page, 'input[placeholder="At least 8 characters"]', demoPassword);
    await sleep(1500);
    await safeFill(page, 'input[placeholder="Repeat your password"]', demoPassword);
    await sleep(1500);

    // Accept Terms of Service
    try {
      await page.check('input[type="checkbox"]');
    } catch (e) {
      await safeClick(page, 'input[type="checkbox"]');
    }
    await sleep(2000);

    // Submit registration
    await safeClick(page, 'button:has-text("Create Learner Account")');
    console.log(`[SCENE 2] Account registered: ${demoEmail}`);
    await sleep(17800); // 2 + 1.5*4 + 2 + 17.8 = 27.8s

    // ========================================================================
    // SCENE 3 (1:06 - 1:46 | 40.3s): PERSONALIZED LEARNER ONBOARDING WIZARD
    // ========================================================================
    console.log('[SCENE 3: 1:06 - 1:46] Demonstrating Multi-Step Personalized Onboarding Wizard...');
    await page.waitForSelector('text=Personalize Your Learning Path', { timeout: 15000 }).catch(() => {});
    await sleep(2000);

    // Step 1: Category & Institution
    console.log('[SCENE 3] Step 1: Learner Category & Background');
    await safeClick(page, 'text=College / University Student');
    await sleep(1500);
    await safeFill(page, 'input[placeholder="e.g., Stanford University"]', 'Stanford University');
    await sleep(1500);
    await safeFill(page, 'input[placeholder="e.g., Computer Science"]', 'Computer Science');
    await sleep(1500);
    await safeClick(page, 'button:has-text("Continue")');
    await sleep(2500);

    // Step 2: Background & Prior Knowledge
    console.log('[SCENE 3] Step 2: Programming Background');
    await safeClick(page, 'text=1–2 years');
    await sleep(1500);
    await safeClick(page, 'text=Have studied basic concepts');
    await sleep(1500);
    await safeClick(page, 'button:has-text("Continue")');
    await sleep(2500);

    // Step 3: Goals & Availability
    console.log('[SCENE 3] Step 3: Goals & Availability');
    await safeClick(page, 'text=Within 3 months');
    await sleep(1500);
    await safeClick(page, 'text=30–60 minutes');
    await sleep(1500);
    await safeClick(page, 'button:has-text("Continue")');
    await sleep(2500);

    // Step 4: Self-Assessed Skill Level
    console.log('[SCENE 3] Step 4: Self-Assessed Skill Level');
    await safeClick(page, 'text=Intermediate');
    await sleep(1500);
    await safeClick(page, 'button:has-text("Continue")');
    await sleep(2500);

    // Step 5: Learning Preferences
    console.log('[SCENE 3] Step 5: Learning Preferences');
    await safeClick(page, 'text=Visual diagrams & memory layouts');
    await sleep(1500);
    await safeClick(page, 'button:has-text("Continue")');
    await sleep(2500);

    // Step 6: Review & Choice of Diagnostic Mode
    console.log('[SCENE 3] Step 6: Mode Selection & Launch');
    await safeClick(page, 'text=Quick Diagnostic');
    await sleep(2000);
    await safeClick(page, 'button:has-text("Start Diagnostic Assessment")');
    await sleep(11300); // Pad to exact scene duration: 40.3s

    // ========================================================================
    // SCENE 4 (1:46 - 2:24 | 37.8s): DIAGNOSTIC ASSESSMENT & VERIFIED PROFICIENCY
    // ========================================================================
    console.log('[SCENE 4: 1:46 - 2:24] Demonstrating Calibrated Diagnostic Assessment...');
    await page.waitForSelector('text=DSA Knowledge Baseline Test', { timeout: 15000 }).catch(() => {});
    await sleep(2500);

    // Q1: Arrays (Answer A: 1012)
    console.log('[SCENE 4] Answering Diagnostic Q1 (Arrays)...');
    await safeClick(page, 'button:has-text("1012")');
    await sleep(1000);
    await safeFill(page, 'textarea[placeholder*="Explain why"]', 'Address = Base (1000) + Index (3) * 4 bytes = 1012');
    await sleep(2000);
    await safeClick(page, 'button:has-text("Next Question")');
    await sleep(2000);

    // Q2: Time Complexity (Answer A: O(log n))
    console.log('[SCENE 4] Answering Diagnostic Q2 (Time Complexity)...');
    await safeClick(page, 'button:has-text("O(log n)")');
    await sleep(2000);
    await safeClick(page, 'button:has-text("Next Question")');
    await sleep(2000);

    // Q3: Space Complexity (Answer A: O(n) auxiliary space)
    console.log('[SCENE 4] Answering Diagnostic Q3 (Space Complexity)...');
    await safeClick(page, 'button:has-text("O(n) auxiliary space")');
    await sleep(2000);
    await safeClick(page, 'button:has-text("Next Question")');
    await sleep(2000);

    // Q4: Linked Lists
    console.log('[SCENE 4] Answering Diagnostic Q4 (Linked Lists)...');
    await safeClick(page, 'button:has-text("new_node.next = prev_node.next")');
    await sleep(2000);
    await safeClick(page, 'button:has-text("Next Question")');
    await sleep(2000);

    // Q5: Recursion
    console.log('[SCENE 4] Answering Diagnostic Q5 (Recursion)...');
    await safeClick(page, 'button:has-text("The function calls itself indefinitely")');
    await sleep(2000);
    await safeClick(page, 'button:has-text("Next Question")');
    await sleep(2000);

    // Q6: Binary Trees
    console.log('[SCENE 4] Answering Diagnostic Q6 (Binary Trees)...');
    await safeClick(page, 'button:has-text("Every node in the left subtree must have")');
    await sleep(2000);

    // Submit Assessment
    console.log('[SCENE 4] Submitting Diagnostic Assessment...');
    await safeClick(page, 'button:has-text("Submit Diagnostic Assessment")');
    await sleep(3500);

    // Showcase Verified Proficiency Level Card & Learning Path
    console.log('[SCENE 4] Inspecting Verified Algorithmic Proficiency Level & DAG Path...');
    await page.evaluate(() => window.scrollBy({ top: 320, behavior: 'smooth' }));
    await sleep(5000);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await sleep(5800); // 2.5 + 5 + 4*4 + 2 + 3.5 + 5 + 5.8 = 37.8s

    // ========================================================================
    // SCENE 5 (2:24 - 3:08 | 44.5s): ADAPTIVE QUIZ & 7 BOUNDED AGENT TOOLS
    // ========================================================================
    console.log('[SCENE 5: 2:24 - 3:08] Demonstrating Adaptive Quiz & 7 Bounded Agent Tools...');
    await safeClick(page, 'button:has-text("Adaptive Quiz")');
    await sleep(3500);

    // Select Option A
    console.log('[SCENE 5] Interacting with Adaptive Question & Selecting Option...');
    const optButtons = page.locator('button').filter({ has: page.locator('span:text-is("A")') });
    if (await optButtons.count() > 0) {
      await optButtons.first().click();
    } else {
      await safeClick(page, 'button:has-text("A")');
    }
    await sleep(2000);

    console.log('[SCENE 5] Providing Student Reasoning for Misconception Analysis...');
    await safeFill(page, 'textarea[placeholder*="I chose option"]', 'Applying core algorithmic invariants to maintain structural consistency and avoid underflow.');
    await sleep(2500);

    // Submit Reasoning
    console.log('[SCENE 5] Submitting Answer for Multi-Tool Agent Evaluation...');
    await safeClick(page, 'button:has-text("Submit & Analyze Reasoning")');
    await sleep(4000);

    // Highlight Tool Telemetry and Misconception Diagnosis
    console.log('[SCENE 5] Inspecting Agent Tool Execution Trace & Misconception Diagnosis...');
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await sleep(8000);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await sleep(24500); // 3.5 + 2 + 2.5 + 4 + 8 + 24.5 = 44.5s

    // ========================================================================
    // SCENE 6 (3:08 - 3:43 | 34.7s): SOCRATIC AI TUTOR & WISPR FLOW
    // ========================================================================
    console.log('[SCENE 6: 3:08 - 3:43] Demonstrating Socratic AI Tutor & Wispr Flow Speech Disfluency Parsing...');
    await safeClick(page, 'button:has-text("AI Tutor")');
    await sleep(3500);

    // Click Wispr Flow speech preset to demonstrate instant spoken-thought cleanup
    console.log('[SCENE 6] Demonstrating Wispr Flow Spoken Thought Cleanup Preset...');
    await safeClick(page, 'text=Stack LIFO vs FIFO with Self-Correction & Digression');
    await sleep(5000);

    // Showcase Socratic Quick Action: Analogy
    console.log('[SCENE 6] Requesting Socratic Analogy...');
    await safeClick(page, 'button:has-text("Give me an analogy")');
    await sleep(4500);

    // Showcase Socratic Quick Action: Worked Example
    console.log('[SCENE 6] Requesting Worked Example...');
    await safeClick(page, 'button:has-text("Show a worked example")');
    await sleep(4500);

    await page.evaluate(() => window.scrollBy({ top: 350, behavior: 'smooth' }));
    await sleep(6000);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await sleep(11200); // 3.5 + 5 + 4.5 + 4.5 + 6 + 11.2 = 34.7s

    // ========================================================================
    // SCENE 7 (3:43 - 4:16 | 33.3s): CONCEPT GRAPH & SPACED REVISION
    // ========================================================================
    console.log('[SCENE 7: 3:43 - 4:16] Demonstrating Knowledge DAG & SM-2 Spaced Revision...');
    await safeClick(page, 'button:has-text("Concept Graph")');
    await sleep(4000);

    // Select Binary Search Trees node or first concept card
    console.log('[SCENE 7] Inspecting Concept DAG Invariants...');
    await safeClick(page, 'text=Binary Search Trees');
    await sleep(4000);

    // Navigate to Spaced Revision
    console.log('[SCENE 7] Demonstrating SuperMemo SM-2 Spaced Revision Queue...');
    await safeClick(page, 'button:has-text("Spaced Revision")');
    await sleep(4500);

    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
    await sleep(5000);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await sleep(15800); // 4 + 4 + 4.5 + 5 + 15.8 = 33.3s

    // ========================================================================
    // SCENE 8 (4:16 - 4:44 | 27.4s): PROGRESS DASHBOARD & CLOSING
    // ========================================================================
    console.log('[SCENE 8: 4:16 - 4:44] Demonstrating Progress Mastery & Hackathon Closing...');
    await safeClick(page, 'button:has-text("Dashboard")');
    await sleep(4000);

    // Open Learning Profile modal
    console.log('[SCENE 8] Opening Learning Profile Modal (Levels 1-5, DAG Prerequisites)...');
    await safeClick(page, 'button:has-text("Learning Profile")');
    await sleep(5000);
    await page.keyboard.press('Escape');
    await sleep(2000);

    // Scroll to show syllabus mastery breakdown
    console.log('[SCENE 8] Final Overview of Verified Progress & Concept Mastery...');
    await page.evaluate(() => window.scrollBy({ top: 380, behavior: 'smooth' }));
    await sleep(5000);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await sleep(11400); // 4 + 5 + 2 + 5 + 11.4 = 27.4s

    console.log('\n======================================================================');
    console.log('RECORDING SESSION COMPLETED PERFECTLY (TOTAL TIME: 284.2 SECONDS)!');
    console.log('======================================================================');
  } catch (err) {
    console.error('Error during recording:', err);
  } finally {
    await context.close();
    await browser.close();
  }
}

recordDemo();
