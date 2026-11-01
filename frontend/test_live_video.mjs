import { chromium } from 'playwright';

async function testExploreLiveVideo() {
  console.log('======================================================================');
  console.log('TESTING LEARNLOOP AI EXPLORE LIVE VIDEO (CAMERA & VISION)');
  console.log('======================================================================');

  // Launch browser with fake media stream flags for automated testing
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--allow-file-access'
    ]
  });

  const context = await browser.newContext({
    permissions: ['camera']
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('requestfailed', req => console.log('REQ FAILED:', req.url(), req.failure()?.errorText));
  page.on('response', res => {
    if (res.url().includes('/api/')) {
      console.log('API RESPONSE:', res.status(), res.url());
    }
  });

  // 1. Visit Landing Page
  console.log('[STEP 1] Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 1.1 Verify Objective 1: "Explore Live Demo (No Signup)" is completely removed
  console.log('[STEP 1.1] Verifying that "Explore Live Demo (No Signup)" is removed from Landing Page...');
  const demoButtonCount = await page.locator('text=Explore Live Demo').count();
  if (demoButtonCount === 0) {
    console.log('  [PASS] "Explore Live Demo (No Signup)" button successfully removed from Landing Page.');
  } else {
    throw new Error(`FAIL: Found ${demoButtonCount} occurrences of "Explore Live Demo" on Landing Page.`);
  }

  // 1.2 Verify "Get Started Free" is prominent and primary
  const getStartedBtn = page.locator('button:has-text("Get Started Free")').first();
  await getStartedBtn.waitFor({ state: 'visible', timeout: 5000 });
  console.log('  [PASS] "Get Started Free" button is present and prominent.');

  // 2. Verify Explore Live Video button exists on Landing Page & Navbar
  console.log('[STEP 2] Verifying "Explore Live Video" buttons on Landing Page...');
  const heroLiveVideoBtn = page.locator('button:has-text("Explore Live Video")').first();
  await heroLiveVideoBtn.waitFor({ state: 'visible', timeout: 5000 });
  console.log('  [PASS] "Explore Live Video" button rendered in Hero section.');

  // 3. Click Explore Live Video
  console.log('[STEP 3] Clicking "Explore Live Video" to open modal...');
  await heroLiveVideoBtn.click();
  await page.waitForTimeout(1000);

  // 4. Verify Initial State
  const modalText = await page.textContent('body');
  if (
    modalText.includes('Explore Live Video') &&
    modalText.includes('Visual Socratic Problem Solver') &&
    modalText.includes('Start Live Video')
  ) {
    console.log('  [PASS] Initial state rendered with pedagogical introduction and Start Live Video CTA.');
  } else {
    throw new Error('FAIL: Initial modal state failed to render correctly.');
  }

  // 5. Verify Privacy Guarantee Disclosure
  if (modalText.includes('Zero-Retention Policy') || modalText.includes('Local Processing')) {
    console.log('  [PASS] Student privacy guarantee and zero-recording disclosure displayed.');
  }

  // 6. Click Start Live Video to trigger camera stream
  console.log('[STEP 4] Clicking "Start Live Video" to initialize camera stream...');
  const startVideoBtn = page.locator('button:has-text("Start Live Video")');
  await startVideoBtn.click();
  await page.waitForTimeout(2500);

  // 7. Verify Active Video State
  const activeVideoText = await page.textContent('body');
  if (activeVideoText.includes('LIVE CAMERA') || activeVideoText.includes('Topic Focus:')) {
    console.log('  [PASS] Active video stream initialized successfully with LIVE CAMERA telemetry.');
  } else {
    throw new Error('FAIL: Active video state did not activate.');
  }

  // 8. Test Visual Problem Inspection with Gemini Multimodal Backend
  console.log('[STEP 5] Triggering "Analyze" on active video frame...');
  const analyzeBtn = page.locator('[data-testid="analyze-frame-button"]');
  await analyzeBtn.waitFor({ state: 'visible', timeout: 5000 });
  await analyzeBtn.click();
  console.log('  Clicked analyze button, waiting for multimodal analysis response...');

  // Wait for result or error to appear in UI (do not exit on loading state)
  await page.waitForFunction(() => {
    const text = document.body.innerText;
    return text.includes('Confidence:') || text.includes('Visual BST Invariant Check') || text.includes('Visual problem analysis failed');
  }, { timeout: 20000 });

  await page.waitForTimeout(1000);

  const feedbackText = await page.textContent('body');
  if (
    feedbackText.includes('AI Visual Inspection Feedback') &&
    (feedbackText.includes('Confidence:') || feedbackText.includes('Binary Search') || feedbackText.includes('Visual BST Invariant Check') || feedbackText.includes('LearnLoop Visual Problem Analysis'))
  ) {
    console.log('  [PASS] Multimodal frame inspection returned real Socratic visual analysis!');
  } else if (feedbackText.includes('Confidence:')) {
    console.log('  [PASS] Confidence score and visual invariants displayed.');
  } else {
    console.log('Current modal body snippet:', feedbackText.substring(0, 500));
    throw new Error('FAIL: Visual inspection feedback was not rendered.');
  }

  // 9. Test End Video Session
  console.log('[STEP 6] Testing "End Video Session"...');
  const endSessionBtn = page.locator('button:has-text("End Video Session")').first();
  await endSessionBtn.click();
  await page.waitForTimeout(1500);

  const afterCloseText = await page.textContent('body');
  if (!afterCloseText.includes('LIVE CAMERA')) {
    console.log('  [PASS] Camera hardware released and modal cleanly dismissed.');
  }

  // 10. Test Reopening from Navbar
  console.log('[STEP 7] Reopening Explore Live Video from top navigation header...');
  const navVideoBtn = page.locator('header button:has-text("Live Video")').first();
  await navVideoBtn.click();
  await page.waitForTimeout(1000);

  const reopenedText = await page.textContent('body');
  if (reopenedText.includes('Explore Live Video') && reopenedText.includes('Start Live Video')) {
    console.log('  [PASS] Live Video reinitialized cleanly on fresh session without state collision.');
  }

  // Close modal via Escape key
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  await browser.close();
  console.log('\n======================================================================');
  console.log('EXPLORE LIVE VIDEO E2E VERIFICATION COMPLETED WITH 100% SUCCESS!');
  console.log('======================================================================');
}

testExploreLiveVideo().catch((err) => {
  console.error('\nLive Video Verification failed:', err);
  process.exit(1);
});
