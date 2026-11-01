import { chromium } from 'playwright';
import http from 'http';
import path from 'path';
import fs from 'fs';

const VIEWPORTS = [
  { name: 'Android_Small_320x640', width: 320, height: 640 },
  { name: 'Android_Budget_360x800', width: 360, height: 800 },
  { name: 'iPhone_Standard_375x812', width: 375, height: 812 },
  { name: 'Pixel_Standard_393x852', width: 393, height: 852 },
  { name: 'Galaxy_Ultra_412x915', width: 412, height: 915 },
  { name: 'Android_Landscape_915x412', width: 915, height: 412 },
  { name: 'Tablet_Portrait_768x1024', width: 768, height: 1024 },
  { name: 'Desktop_Reference_1280x800', width: 1280, height: 800 },
];

const ARTIFACT_DIR = 'C:/Users/KIIT/.gemini/antigravity/brain/e367d5ba-84ad-4a0c-b296-3d8b8e00b07e/mobile_verification';
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const DIST_DIR = path.resolve('dist');

function startServer(port = 4173) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.json': 'application/json'
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';

    let filePath = path.join(DIST_DIR, reqPath);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading file');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      console.log(`Static server running at http://127.0.0.1:${port}/`);
      resolve(server);
    });
  });
}

async function run() {
  const server = await startServer(4173);

  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch (e1) {
    try {
      browser = await chromium.launch({ channel: 'chrome', headless: true });
    } catch (e2) {
      console.error('Neither msedge nor chrome found:', e2.message);
      throw e2;
    }
  }
  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2
    });

    try {
      await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(600);

      // Check horizontal overflow
      const overflow = await page.evaluate(() => {
        const docWidth = document.documentElement.offsetWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        const bodyScrollWidth = document.body.scrollWidth;
        return {
          docWidth,
          scrollWidth,
          innerWidth,
          bodyScrollWidth,
          hasOverflow: scrollWidth > innerWidth + 1 || bodyScrollWidth > innerWidth + 1
        };
      });

      // Verify CTA button visible
      const getStartedBtn = page.getByRole('button', { name: /Get Started Free/i }).first();
      const isGetStartedVisible = await getStartedBtn.isVisible();

      // Check if hamburger button is visible on mobile
      const isMobile = vp.width < 640;
      let hamburgerWorks = null;
      if (isMobile) {
        const toggleBtn = page.getByLabel('Toggle Navigation Menu');
        const isToggleVisible = await toggleBtn.isVisible();
        if (isToggleVisible) {
          await toggleBtn.click();
          await page.waitForTimeout(400);
          // Check that drawer opened
          const diagnosticLink = page.getByRole('button', { name: /Diagnostic Test/i }).first();
          const isDrawerOpen = await diagnosticLink.isVisible();
          hamburgerWorks = isDrawerOpen;
        }
      }

      // Take screenshot
      const screenshotPath = path.join(ARTIFACT_DIR, `${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      results.push({
        name: vp.name,
        width: vp.width,
        height: vp.height,
        scrollWidth: overflow.scrollWidth,
        innerWidth: overflow.innerWidth,
        hasOverflow: overflow.hasOverflow,
        isGetStartedVisible,
        hamburgerWorks,
        status: !overflow.hasOverflow && isGetStartedVisible ? 'PASS' : 'FAIL'
      });

      console.log(`  -> Status: ${!overflow.hasOverflow ? 'PASS (Zero Horizontal Overflow)' : 'FAIL (Horizontal Overflow!)'}`);
      console.log(`  -> InnerWidth: ${overflow.innerWidth}px, ScrollWidth: ${overflow.scrollWidth}px`);
      console.log(`  -> Get Started CTA Visible: ${isGetStartedVisible}`);
      if (isMobile) console.log(`  -> Mobile Hamburger Menu: ${hamburgerWorks ? 'WORKING' : 'CHECK'}`);
    } catch (err) {
      console.error(`Error testing ${vp.name}:`, err.message);
      results.push({ name: vp.name, status: 'ERROR', error: err.message });
    } finally {
      await page.close();
    }
  }

  await browser.close();
  server.close();

  console.log('\n========================================');
  console.log('MOBILE RESPONSIVENESS MATRIX RESULTS:');
  console.log('========================================');
  console.table(results);

  const allPassed = results.every((r) => r.status === 'PASS');
  console.log(`\nALL VIEWPORTS PASSED: ${allPassed ? 'YES (100% SUCCESS)' : 'NO'}`);
  process.exit(allPassed ? 0 : 1);
}

run().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
