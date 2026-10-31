import { chromium } from 'playwright';

async function test() {
  const b = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await b.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  console.log('getByRole Sign Up:', await page.getByRole('button', { name: 'Sign Up' }).count());
  console.log('locator text=Sign Up:', await page.locator('text=Sign Up').count());
  console.log('getByRole Adaptive Quiz:', await page.getByRole('button', { name: 'Adaptive Quiz' }).count());
  console.log('locator text=Adaptive Quiz:', await page.locator('text=Adaptive Quiz').count());
  await b.close();
}

test();
