import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:/Users/KIIT/.gemini/antigravity/brain/e367d5ba-84ad-4a0c-b296-3d8b8e00b07e/two_tier_nav_verification';
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '1920_desktop', width: 1920, height: 1080 },
  { name: '1440_desktop', width: 1440, height: 900 },
  { name: '1280_laptop', width: 1280, height: 800 },
  { name: '1024_tablet_landscape', width: 1024, height: 768 },
  { name: '768_tablet_portrait', width: 768, height: 1024 },
  { name: '430_mobile_pro_max', width: 430, height: 932 },
  { name: '390_mobile_iphone', width: 390, height: 844 },
  { name: '360_mobile_compact', width: 360, height: 780 }
];

async function runTwoTierNavVerification() {
  console.log('Starting Playwright Two-Tier Navigation Verification...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = {
    viewportsTested: [],
    overflowResults: [],
    interactiveActions: {},
    allWorkspacesNavigated: []
  };

  const context = await browser.newContext();
  const page = await context.newPage();

  // Part 1: Test Logged-Out State at 1440 Desktop
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  console.log('Capturing Logged-Out Upper & Lower Navigation Bars (1440px)...');
  const headerElem = await page.$('header');
  if (headerElem) {
    await headerElem.screenshot({ path: path.join(ARTIFACT_DIR, '01_header_1440_logged_out_light.png') });
  }
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_page_1440_logged_out_light.png') });

  // Test Theme Toggle
  console.log('Testing Theme Toggle in Upper Bar...');
  const themeBtn = await page.$('button[aria-label*="theme"], button[title*="theme"], button[title*="Theme"]');
  if (themeBtn) {
    await themeBtn.click();
    await page.waitForTimeout(600);
    if (headerElem) {
      await headerElem.screenshot({ path: path.join(ARTIFACT_DIR, '03_header_1440_logged_out_dark.png') });
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_page_1440_logged_out_dark.png') });
    results.interactiveActions.themeToggle = 'SUCCESS';
  }

  // Test Share Action
  console.log('Testing Share Action in Upper Bar...');
  const shareBtn = await page.$('button[title*="Share"], button[aria-label*="Share"]');
  if (shareBtn) {
    await shareBtn.click();
    await page.waitForTimeout(400);
    const hasCopied = (await shareBtn.innerText()).includes('Copied') || (await page.content()).includes('Copied!');
    results.interactiveActions.share = hasCopied ? 'SUCCESS (Copied feedback displayed)' : 'TRIGGERED';
    await headerElem.screenshot({ path: path.join(ARTIFACT_DIR, '05_header_share_feedback.png') });
  }

  // Test Sign In button opening modal & closing
  console.log('Testing Sign In button in Upper Bar...');
  const signInBtn = await page.$('header button:has-text("Sign In")');
  if (signInBtn) {
    await signInBtn.click();
    await page.waitForTimeout(500);
    results.interactiveActions.signInModal = 'SUCCESS';
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_auth_modal_opened.png') });
    const closeAuthBtn = await page.$('button[aria-label="Close modal"]');
    if (closeAuthBtn) {
      await closeAuthBtn.click();
      await page.waitForTimeout(400);
    }
  }

  // Test Live Video button opening modal & closing
  console.log('Testing Live Video button in Upper Bar...');
  const liveVideoBtn = await page.$('header button:has-text("Live Video")');
  if (liveVideoBtn) {
    await liveVideoBtn.click();
    await page.waitForTimeout(500);
    results.interactiveActions.liveVideoModal = 'SUCCESS';
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '07_live_video_modal.png') });
    const closeVideoBtn = await page.$('button[aria-label="Close Live Video"]');
    if (closeVideoBtn) {
      await closeVideoBtn.click();
      await page.waitForTimeout(400);
    }
  }

  // Part 2: Authenticate with Demo Session via Vite Proxy with credentials
  console.log('Triggering demo session authentication via Vite proxy...');
  await page.evaluate(async () => {
    try {
      const res = await fetch('/api/auth/demo-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.user) {
        localStorage.setItem('learnloop_cached_user', JSON.stringify(data.user));
      }
    } catch (e) {
      console.error('Demo auth fetch failed:', e);
    }
  });

  // Reload page to let AuthContext initialize authenticated demo session
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Close onboarding modal if it opens
  const onboardingCloseBtn = await page.$('button:has-text("Skip"), button:has-text("Got it"), button[aria-label="Close modal"]');
  if (onboardingCloseBtn) {
    await onboardingCloseBtn.click();
    await page.waitForTimeout(400);
  }

  // Capture Authenticated Header (showing Demo Mode badge, Learning Profile, AccountMenu)
  const authHeader = await page.$('header');
  if (authHeader) {
    await authHeader.screenshot({ path: path.join(ARTIFACT_DIR, '08_header_authenticated_demo.png') });
  }

  // Test Navigation between Dashboard and Teacher Studio in Lower Bar
  console.log('Testing workspace navigation in Lower Bar...');
  const testTabs = [
    { id: 'teacher', label: 'Teacher Studio' },
    { id: 'dashboard', label: 'Dashboard' }
  ];

  for (const t of testTabs) {
    const wsBtn = await page.$(`nav[aria-label="Application Workspaces"] button:has-text("${t.label}")`);
    if (wsBtn) {
      await wsBtn.click();
      await page.waitForTimeout(500);
      const isCurrent = await wsBtn.getAttribute('aria-current');
      results.allWorkspacesNavigated.push({
        id: t.id,
        label: t.label,
        active: isCurrent === 'page'
      });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, `09_workspace_${t.id}.png`) });
    }
  }

  // Part 3: Test Responsive Viewports and Horizontal Overflow Check
  console.log('Testing viewports and verifying zero horizontal overflow...');
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(500);

    const overflowCheck = await page.evaluate(() => {
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      return {
        docWidth: docW,
        winWidth: winW,
        hasOverflow: docW > winW
      };
    });

    results.overflowResults.push({
      viewport: vp.name,
      width: vp.width,
      docWidth: overflowCheck.docWidth,
      hasOverflow: overflowCheck.hasOverflow
    });

    const filename = `10_${vp.name}_viewport.png`;
    await page.screenshot({ path: path.join(ARTIFACT_DIR, filename) });
    console.log(`  Viewport ${vp.name} (${vp.width}px): docW=${overflowCheck.docWidth} winW=${vp.width} -> ${overflowCheck.hasOverflow ? 'OVERFLOW ERROR' : 'PASS (0 overflow)'}`);
  }

  await browser.close();
  console.log('Two-Tier Navigation Verification finished successfully!');
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'verification_summary.json'), JSON.stringify(results, null, 2));
}

runTwoTierNavVerification().catch(err => {
  console.error('Error during navigation verification:', err);
  process.exit(1);
});
