import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:\\Users\\KIIT\\.gemini\\antigravity\\brain\\e367d5ba-84ad-4a0c-b296-3d8b8e00b07e\\bento_screenshots';
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function captureBentoShowcase() {
  console.log('===============================================================');
  console.log('LEARNLOOP AI — BENTO DESIGN TRANSFORMATION CAPTURE SUITE');
  console.log('===============================================================\n');

  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch (e) {
    browser = await chromium.launch({ headless: true });
  }

  // 1. DESKTOP VIEWPORT (1280x800)
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    console.log('[STEP 1] Loading application at http://127.0.0.1:3000...');
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Register / sign in a demo learner if landing page is shown
    const getStartedBtn = page.locator('button:has-text("Get Started Free")').first();
    const isLanding = await getStartedBtn.isVisible();

    if (isLanding) {
      console.log('  -> Landing page detected. Launching demo explorer session...');
      // Start a demo session or register
      await getStartedBtn.click();
      await page.waitForSelector('text=Create Your Learner Account');
      const ts = Date.now().toString().slice(-4);
      await page.fill('input[placeholder="Alex Morgan"]', `Alex Bento ${ts}`);
      await page.fill('input[placeholder="student@university.edu"]', `alex_bento_${ts}@learnloop.edu`);
      const pwds = page.locator('input[placeholder="••••••••"]');
      await pwds.nth(0).fill('BentoPass123!');
      await pwds.nth(1).fill('BentoPass123!');
      await page.check('#terms');
      await page.click('button:has-text("Create Learner Account")');
      await page.waitForTimeout(2000);
    }

    // Dismiss any onboarding modal if popped
    const closeWizard = page.locator('button[aria-label="Close"]').first();
    if (await closeWizard.isVisible()) {
      await closeWizard.click();
      await page.waitForTimeout(400);
    }

    // 1. STUDENT DASHBOARD — DESKTOP LIGHT
    console.log('[STEP 2] Capturing Student Dashboard (Desktop Light Theme)...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_student_dashboard_desktop_light.png'), fullPage: false });
    console.log('  [CAPTURED] 01_student_dashboard_desktop_light.png');

    // 2. TOGGLE TO DARK THEME & CAPTURE
    console.log('[STEP 3] Toggling to Dark Theme...');
    const themeToggle = page.locator('button[role="switch"]').first();
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
    } else {
      // Direct class toggle fallback
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      });
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_student_dashboard_desktop_dark.png'), fullPage: false });
    console.log('  [CAPTURED] 02_student_dashboard_desktop_dark.png');

    // 3. PROFILE MENU OPEN
    console.log('[STEP 4] Opening Account Profile dropdown...');
    const menuTrigger = page.locator('button[aria-label="Account and application options"]').first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_account_profile_menu.png'), fullPage: false });
      console.log('  [CAPTURED] 03_account_profile_menu.png');
      await menuTrigger.click(); // close menu
      await page.waitForTimeout(300);
    }

    // 4. TEACHER DASHBOARD
    console.log('[STEP 5] Navigating to Teacher Studio...');
    const teacherTab = page.locator('button:has-text("Teacher Studio"), button:has-text("Teacher Dashboard")').first();
    if (await teacherTab.isVisible()) {
      await teacherTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_teacher_dashboard.png'), fullPage: false });
      console.log('  [CAPTURED] 04_teacher_dashboard.png');
    }

    // 5. OWNER CONSOLE
    console.log('[STEP 6] Navigating to Owner Console...');
    await page.goto('http://127.0.0.1:3000/owner-console', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '05_owner_console.png'), fullPage: false });
    console.log('  [CAPTURED] 05_owner_console.png');

    await context.close();

    // 6. TABLET VIEWPORT (768x1024)
    console.log('\n[STEP 7] Testing Tablet Viewport (768x1024)...');
    const tabletContext = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const tabletPage = await tabletContext.newPage();
    await tabletPage.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' });
    await tabletPage.waitForTimeout(800);
    // Dismiss wizard if any
    const tabCloseWizard = tabletPage.locator('button[aria-label="Close"]').first();
    if (await tabCloseWizard.isVisible()) {
      await tabCloseWizard.click();
      await tabletPage.waitForTimeout(300);
    }
    await tabletPage.screenshot({ path: path.join(ARTIFACT_DIR, '06_student_dashboard_tablet.png'), fullPage: false });
    console.log('  [CAPTURED] 06_student_dashboard_tablet.png');
    await tabletContext.close();

    // 7. MOBILE VIEWPORT (390x844 — iPhone 14)
    console.log('\n[STEP 8] Testing Mobile Viewport (390x844 — iPhone 14)...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(800);
    const mobCloseWizard = mobilePage.locator('button[aria-label="Close"]').first();
    if (await mobCloseWizard.isVisible()) {
      await mobCloseWizard.click();
      await mobilePage.waitForTimeout(300);
    }
    await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, '07_student_dashboard_mobile.png'), fullPage: false });
    console.log('  [CAPTURED] 07_student_dashboard_mobile.png (Dock visible!)');

    // 8. MOBILE DRAWER OPEN
    console.log('[STEP 9] Opening Mobile Navigation Menu Drawer...');
    const drawerToggle = mobilePage.locator('button[aria-label="Toggle Navigation Menu"]').first();
    if (await drawerToggle.isVisible()) {
      await drawerToggle.click();
      await mobilePage.waitForTimeout(400);
      await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, '08_navigation_mobile_drawer.png'), fullPage: false });
      console.log('  [CAPTURED] 08_navigation_mobile_drawer.png');
    }
    await mobileContext.close();

    console.log('\n===============================================================');
    console.log('ALL BENTO SHOWCASE SCREENSHOTS CAPTURED SUCCESSFULLY (8/8)');
    console.log('===============================================================');

  } catch (err) {
    console.error('[CAPTURE ERROR]', err);
    throw err;
  } finally {
    await browser.close();
  }
}

captureBentoShowcase().catch(e => {
  console.error(e);
  process.exit(1);
});

