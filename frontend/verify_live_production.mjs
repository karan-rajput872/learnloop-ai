import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:/Users/KIIT/.gemini/antigravity/brain/e367d5ba-84ad-4a0c-b296-3d8b8e00b07e/owner_console_verification';
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function verifyLiveProduction() {
  console.log('Launching browser to test live Vercel production URL...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Test 1: Direct navigation to owner console
  console.log('Navigating directly to https://learnloop-ai-one.vercel.app/owner-console ...');
  const response = await page.goto('https://learnloop-ai-one.vercel.app/owner-console', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  console.log('HTTP Status Code:', response.status());

  // Wait for React hydration
  await page.waitForTimeout(2000);

  // Check page elements
  const pageContent = await page.content();
  const hasOwnerTitle = pageContent.includes('LearnLoop AI Private Owner Console') || pageContent.includes('Owner Authentication Required');
  console.log('Contains Owner Console Title / Auth gate:', hasOwnerTitle);

  // Take screenshot of live Vercel owner console auth gate
  const screenshotPath = path.join(ARTIFACT_DIR, '11_live_vercel_owner_console.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Saved screenshot to:', screenshotPath);

  // Test 2: Verify public home page has NO link to owner-console
  console.log('Checking public landing page for any leaked owner links...');
  await page.goto('https://learnloop-ai-one.vercel.app', { waitUntil: 'networkidle' });
  const publicLinks = await page.$$eval('a', anchors => anchors.map(a => a.href));
  const leakedLinks = publicLinks.filter(href => href.includes('owner-console') || href.includes('owner'));
  console.log('Owner links found in public navigation:', leakedLinks.length, leakedLinks);

  await browser.close();
  console.log('Live production verification complete!');
}

verifyLiveProduction().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
