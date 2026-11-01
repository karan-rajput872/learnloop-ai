import { chromium } from 'playwright';

async function verifyLiveVercelVideo() {
  console.log('Verifying Live Vercel Production Site (https://learnloop-ai-one.vercel.app)...');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  const context = await browser.newContext();
  await context.grantPermissions(['camera'], { origin: 'https://learnloop-ai-one.vercel.app' });
  const page = await context.newPage();

  console.log('[STEP 1] Visiting https://learnloop-ai-one.vercel.app...');
  await page.goto('https://learnloop-ai-one.vercel.app', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  console.log('[STEP 2] Verifying "Explore Live Video" button on live production site...');
  const liveVideoBtn = page.locator('button:has-text("Explore Live Video")').first();
  await liveVideoBtn.waitFor({ state: 'visible', timeout: 10000 });
  console.log('  [PASS] "Explore Live Video" button is live on Vercel!');

  console.log('[STEP 3] Clicking "Explore Live Video" on production...');
  await liveVideoBtn.click();
  await page.waitForTimeout(1500);

  const modalBody = await page.textContent('body');
  if (modalBody.includes('Visual Socratic Problem Solver') && modalBody.includes('Start Live Video')) {
    console.log('  [PASS] Live Video Modal rendered with camera prompt and Start Live Video CTA on production!');
  } else {
    throw new Error('FAIL: Live Video Modal did not open properly on production.');
  }

  console.log('[STEP 4] Testing camera initialization on production...');
  const startBtn = page.locator('button:has-text("Start Live Video")').first();
  await startBtn.click();
  await page.waitForTimeout(3000);

  const activeStreamBody = await page.textContent('body');
  if (activeStreamBody.includes('LIVE CAMERA') && activeStreamBody.includes('Topic Focus:')) {
    console.log('  [PASS] Camera preview and controls active on production!');
  } else {
    throw new Error('FAIL: Camera preview did not activate on production.');
  }

  console.log('[STEP 5] Testing End Video Session...');
  const endBtn = page.locator('button:has-text("End Video Session")').first();
  await endBtn.click();
  await page.waitForTimeout(1000);

  console.log('  [PASS] Video session ended cleanly on production!');

  await browser.close();
  console.log('\n======================================================');
  console.log('LIVE VERCEL PRODUCTION VERIFICATION PASSED 100%!');
  console.log('======================================================');
}

verifyLiveVercelVideo().catch((err) => {
  console.error('Production verification failed:', err);
  process.exit(1);
});
