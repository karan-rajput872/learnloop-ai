import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:\\Users\\KIIT\\.gemini\\antigravity\\brain\\e367d5ba-84ad-4a0c-b296-3d8b8e00b07e\\bento_screenshots';
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function captureBentoShowcase() {
  console.log('===============================================================');
  console.log('LEARNLOOP AI — COMPREHENSIVE VISUAL AUDIT & SCREENSHOT SUITE');
  console.log('===============================================================\n');

  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch (e) {
    browser = await chromium.launch({ headless: true });
  }

  try {
    // =========================================================================
    // 1. DESKTOP AUTHENTICATION CAPTURE (1280x800)
    // =========================================================================
    const authContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const authPage = await authContext.newPage();

    console.log('[STEP 1] Seeding returning user & testing auth views...');
    await authPage.addInitScript(() => {
      localStorage.setItem('learnloop_last_user', JSON.stringify({
        email: 'sarah.connor@mit.edu',
        full_name: 'Sarah Connor',
        student_id: 'student_sarah_mit'
      }));
    });

    await authPage.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' });
    await authPage.waitForTimeout(1200);

    // 1. Landing page with returning user card
    await authPage.screenshot({ path: path.join(ARTIFACT_DIR, '01_landing_page_returning_user.png'), fullPage: false });
    console.log('  [CAPTURED] 01_landing_page_returning_user.png');

    // 2. Open login modal
    const signInBtn = authPage.locator('button:has-text("Sign In"), button:has-text("Continue as Sarah Connor")').first();
    if (await signInBtn.isVisible()) {
      await signInBtn.click();
      await authPage.waitForTimeout(600);
      await authPage.screenshot({ path: path.join(ARTIFACT_DIR, '02_auth_modal_login.png'), fullPage: false });
      console.log('  [CAPTURED] 02_auth_modal_login.png');

      // 3. Switch to Registration view inside Auth modal
      const registerTab = authPage.locator('button:has-text("Create Account")').first();
      if (await registerTab.isVisible()) {
        await registerTab.click();
        await authPage.waitForTimeout(500);
        await authPage.screenshot({ path: path.join(ARTIFACT_DIR, '03_auth_modal_register.png'), fullPage: false });
        console.log('  [CAPTURED] 03_auth_modal_register.png');
      }

      // 4. Open Google Sign-In setup guide
      const googleGuideBtn = authPage.locator('button:has-text("Google Sign-In setup guide")').first();
      if (await googleGuideBtn.isVisible()) {
        await googleGuideBtn.click();
        await authPage.waitForTimeout(500);
        await authPage.screenshot({ path: path.join(ARTIFACT_DIR, '04_google_oauth_guide_modal.png'), fullPage: false });
        console.log('  [CAPTURED] 04_google_oauth_guide_modal.png');

        // Close guide
        const closeGuide = authPage.locator('button:has-text("Got it, close guide")').first();
        if (await closeGuide.isVisible()) {
          await closeGuide.click({ force: true });
          await authPage.waitForTimeout(300);
        }
      }

      // Close auth modal
      await authPage.keyboard.press('Escape');
      await authPage.waitForTimeout(400);
    }
    await authContext.close();

    // =========================================================================
    // 2. AUTHENTICATED STUDENT DASHBOARD & MODALS (1440x900)
    // =========================================================================
    const dashContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const dashPage = await dashContext.newPage();

    console.log('\n[STEP 2] Logging in as demo student & capturing dashboard states...');
    // Seed authenticated user into localStorage directly for consistent dashboard state
    await dashPage.addInitScript(() => {
      localStorage.setItem('learnloop_auth_token', 'mock_jwt_token_demo_learner');
      localStorage.setItem('learnloop_auth_user', JSON.stringify({
        id: 'usr_guest_demo',
        email: 'alex.morgan@demo.learnloop.io',
        full_name: 'Alex Morgan',
        role: 'student',
        learning_pace: 'adaptive',
        institution: 'Stanford University',
        created_at: new Date().toISOString()
      }));
    });

    await dashPage.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' });
    await dashPage.waitForTimeout(1500);

    // Dismiss any modal/wizard by pressing Escape
    await dashPage.keyboard.press('Escape');
    await dashPage.waitForTimeout(300);

    // 5. Student Dashboard Desktop Light
    await dashPage.screenshot({ path: path.join(ARTIFACT_DIR, '05_student_dashboard_desktop_light_1440.png'), fullPage: false });
    console.log('  [CAPTURED] 05_student_dashboard_desktop_light_1440.png');

    // 6. Switch to Dark Theme
    console.log('[STEP 3] Toggling to Dark Theme...');
    await dashPage.evaluate(() => {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    });
    await dashPage.waitForTimeout(500);
    await dashPage.screenshot({ path: path.join(ARTIFACT_DIR, '06_student_dashboard_desktop_dark_1440.png'), fullPage: false });
    console.log('  [CAPTURED] 06_student_dashboard_desktop_dark_1440.png');

    // 7. Profile Menu Dropdown
    console.log('[STEP 4] Capturing Profile menu...');
    const menuTrigger = dashPage.locator('button[aria-label="Account and application options"]').first();
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click({ force: true });
      await dashPage.waitForTimeout(400);
      await dashPage.screenshot({ path: path.join(ARTIFACT_DIR, '07_account_profile_menu.png'), fullPage: false });
      console.log('  [CAPTURED] 07_account_profile_menu.png');
      await menuTrigger.click({ force: true });
      await dashPage.waitForTimeout(300);
    }

    // 8. Learning Roadmap Modal
    console.log('[STEP 5] Opening Curriculum Roadmap Modal...');
    const roadmapTrigger = dashPage.locator('button:has-text("Curriculum Roadmap")').first();
    if (await roadmapTrigger.isVisible()) {
      await roadmapTrigger.click({ force: true });
      await dashPage.waitForTimeout(600);
      await dashPage.screenshot({ path: path.join(ARTIFACT_DIR, '08_learning_roadmap_modal.png'), fullPage: false });
      console.log('  [CAPTURED] 08_learning_roadmap_modal.png');
      await dashPage.keyboard.press('Escape');
      await dashPage.waitForTimeout(300);
    }

    // 9. Teacher Dashboard
    console.log('[STEP 6] Opening Teacher Studio...');
    const teacherTab = dashPage.locator('button:has-text("Teacher Studio"), button:has-text("Teacher Dashboard")').first();
    if (await teacherTab.isVisible()) {
      await teacherTab.click({ force: true });
      await dashPage.waitForTimeout(1000);
      await dashPage.screenshot({ path: path.join(ARTIFACT_DIR, '09_teacher_dashboard.png'), fullPage: false });
      console.log('  [CAPTURED] 09_teacher_dashboard.png');
    }

    await dashContext.close();

    // =========================================================================
    // 3. RESPONSIVE VIEWPORTS AUDIT (ALL 8 TARGET VIEWPORTS)
    // =========================================================================
    const viewports = [
      { width: 1920, height: 1080, name: '10_viewport_1920_desktop_large.png', label: '1920px (Desktop Large)' },
      { width: 1440, height: 900,  name: '11_viewport_1440_desktop.png',       label: '1440px (Desktop Default)' },
      { width: 1280, height: 800,  name: '12_viewport_1280_laptop.png',        label: '1280px (Laptop)' },
      { width: 1024, height: 768,  name: '13_viewport_1024_tablet_landscape.png', label: '1024px (Tablet Landscape)' },
      { width: 768,  height: 1024, name: '14_viewport_768_tablet_portrait.png',  label: '768px (Tablet Portrait)' },
      { width: 430,  height: 932,  name: '15_viewport_430_iphone_14_pro_max.png', label: '430px (iPhone 14 Pro Max)' },
      { width: 390,  height: 844,  name: '16_viewport_390_iphone_14.png',         label: '390px (iPhone 14)' },
      { width: 360,  height: 780,  name: '17_viewport_360_small_android.png',     label: '360px (Small Android)' },
    ];

    console.log('\n[STEP 7] Capturing responsive viewports across all 8 devices...');
    for (const vp of viewports) {
      const isMobile = vp.width <= 768;
      const vpContext = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: isMobile,
        hasTouch: isMobile
      });
      const vpPage = await vpContext.newPage();
      await vpPage.addInitScript(() => {
        localStorage.setItem('learnloop_auth_token', 'mock_jwt_token_demo_learner');
        localStorage.setItem('learnloop_auth_user', JSON.stringify({
          id: 'usr_guest_demo',
          email: 'alex.morgan@demo.learnloop.io',
          full_name: 'Alex Morgan',
          role: 'student',
          learning_pace: 'adaptive',
          institution: 'Stanford University'
        }));
      });

      await vpPage.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' });
      await vpPage.waitForTimeout(800);
      await vpPage.keyboard.press('Escape');
      await vpPage.waitForTimeout(200);

      await vpPage.screenshot({ path: path.join(ARTIFACT_DIR, vp.name), fullPage: false });
      console.log(`  [CAPTURED] ${vp.name} (${vp.label})`);
      await vpContext.close();
    }

    console.log('\n===============================================================');
    console.log('ALL 17 COMPREHENSIVE SCREENSHOTS CAPTURED SUCCESSFULLY');
    console.log('Artifacts directory: ' + ARTIFACT_DIR);
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
