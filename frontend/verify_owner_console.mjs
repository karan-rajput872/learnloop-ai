import { chromium } from 'playwright';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const ARTIFACT_DIR = 'C:/Users/KIIT/.gemini/antigravity/brain/e367d5ba-84ad-4a0c-b296-3d8b8e00b07e/owner_console_verification';
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const DIST_DIR = path.resolve('dist');

function startStaticServer(port = 4173) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.json': 'application/json'
  };

  const server = http.createServer((req, res) => {
    // Proxy /api/ requests to Python backend on port 8000
    if (req.url.startsWith('/api/')) {
      const proxyReq = http.request(
        {
          hostname: '127.0.0.1',
          port: 8000,
          path: req.url,
          method: req.method,
          headers: req.headers
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        }
      );
      proxyReq.on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Backend unreachable', details: err.message }));
      });
      req.pipe(proxyReq, { end: true });
      return;
    }

    // Static file serving with SPA fallback to index.html
    const parsedPath = req.url.split('?')[0];
    let filePath = path.join(DIST_DIR, parsedPath === '/' ? 'index.html' : parsedPath);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

function startBackend() {
  const pythonPath = path.resolve('../backend/.venv/Scripts/python.exe');
  const backendDir = path.resolve('../backend');
  const proc = spawn(pythonPath, ['-m', 'uvicorn', 'app.main:app', '--port', '8000', '--host', '127.0.0.1'], {
    cwd: backendDir,
    stdio: 'ignore'
  });
  return proc;
}

async function waitForBackend(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/health');
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function run() {
  console.log('1. Starting Python FastAPI backend...');
  const backendProc = startBackend();

  const isReady = await waitForBackend();
  if (!isReady) {
    console.error('FastAPI backend failed to start on port 8000');
    backendProc.kill();
    process.exit(1);
  }
  console.log('✓ FastAPI backend is active and healthy on port 8000');

  console.log('2. Starting Node.js static & proxy server on port 4173...');
  const staticServer = await startStaticServer(4173);
  console.log('✓ Static & proxy server active on http://127.0.0.1:4173');

  console.log('3. Launching Playwright browser (Edge channel)...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // Step 1: Open /owner-console without credentials
    console.log('--- Step 1: Verify Unauthenticated Owner Login Screen ---');
    await page.goto('http://127.0.0.1:4173/owner-console');
    await page.waitForSelector('text=LearnLoop Owner Console');
    await page.screenshot({ path: `${ARTIFACT_DIR}/01_owner_login_prompt.png`, fullPage: true });
    console.log('✓ 01_owner_login_prompt.png captured');

    // Step 2: Sign in as Platform Owner
    console.log('--- Step 2: Authenticate as Owner ---');
    await page.fill('input[type="password"]', 'OwnerPass123456!');
    await page.click('button[type="submit"]');

    // Wait for Overview page to load
    await page.waitForSelector('text=Platform Telemetry Overview');
    await page.waitForSelector('text=Total Registered');
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: `${ARTIFACT_DIR}/02_owner_overview_metrics.png`, fullPage: true });
    console.log('✓ 02_owner_overview_metrics.png captured');

    // Step 3: User Directory Tab
    console.log('--- Step 3: Inspect User Directory ---');
    await page.click('button:has-text("User Directory")');
    await page.waitForSelector('text=Registered User Directory');
    await page.waitForSelector('text=User Details');
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: `${ARTIFACT_DIR}/03_owner_user_directory.png`, fullPage: true });
    console.log('✓ 03_owner_user_directory.png captured');

    // Step 4: Open User Detail Inspector
    console.log('--- Step 4: Open User Detail Inspector ---');
    const inspectBtn = await page.locator('button:has-text("Inspect")').first();
    await inspectBtn.click();
    await page.waitForSelector('text=Concept Mastery Progress');
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: `${ARTIFACT_DIR}/04_owner_user_detail_inspector.png` });
    console.log('✓ 04_owner_user_detail_inspector.png captured');

    // Close Inspector
    await page.click('button:has-text("Close Inspector")');
    await new Promise((r) => setTimeout(r, 400));

    // Step 5: Login Activity Tab
    console.log('--- Step 5: Login Activity & Browser Telemetry ---');
    await page.click('button:has-text("Login Activity")');
    await page.waitForSelector('text=Authentication & Login Activity');
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: `${ARTIFACT_DIR}/05_owner_login_activity.png`, fullPage: true });
    console.log('✓ 05_owner_login_activity.png captured');

    // Step 6: Learning Activity Tab
    console.log('--- Step 6: Learning Activity & Feature Adoption ---');
    await page.click('button:has-text("Learning Activity")');
    await page.waitForSelector('text=Learning Activity & Feature Adoption');
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: `${ARTIFACT_DIR}/06_owner_learning_telemetry.png`, fullPage: true });
    console.log('✓ 06_owner_learning_telemetry.png captured');

    // Step 7: Retention & Cohorts Tab
    console.log('--- Step 7: Retention & Cohorts ---');
    await page.click('button:has-text("Retention & Cohorts")');
    await page.waitForSelector('text=Weekly User Retention Matrix');
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: `${ARTIFACT_DIR}/07_owner_cohort_retention.png`, fullPage: true });
    console.log('✓ 07_owner_cohort_retention.png captured');

    // Step 8: Reports & CSV Tab
    console.log('--- Step 8: Reports & CSV Exports ---');
    await page.click('button:has-text("Reports & CSV")');
    await page.waitForSelector('text=Platform Telemetry Reports & CSV Exports');
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: `${ARTIFACT_DIR}/08_owner_reports_csv.png`, fullPage: true });
    console.log('✓ 08_owner_reports_csv.png captured');

    // Step 9: Security & Audit Tab
    console.log('--- Step 9: Security & Audit Trail ---');
    await page.click('button:has-text("Security & Audit")');
    await page.waitForSelector('text=Security & Administrative Audit Trail');
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: `${ARTIFACT_DIR}/09_owner_security_audit_trail.png`, fullPage: true });
    console.log('✓ 09_owner_security_audit_trail.png captured');

    console.log('\n============================================================');
    console.log('ALL OWNER CONSOLE VERIFICATION STEPS PASSED (100% SUCCESS)');
    console.log('============================================================');
  } catch (err) {
    console.error('Playwright verification failed:', err);
  } finally {
    await browser.close();
    staticServer.close();
    backendProc.kill();
    process.exit(0);
  }
}

run();

