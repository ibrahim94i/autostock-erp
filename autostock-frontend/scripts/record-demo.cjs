const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE = process.env.DEMO_URL || 'http://localhost:5173';
const OUT_DIR = path.join('c:\\Users\\hp\\Desktop', 'autostock-demo');
const WEBM_OUT = path.join(OUT_DIR, 'AutoStock-ERP-Demo.webm');
const MP4_OUT = path.join('c:\\Users\\hp\\Desktop', 'AutoStock-ERP-Demo.mp4');

async function wait(page, ms) {
  await page.waitForTimeout(ms);
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('input[autocomplete="username"]').waitFor({ timeout: 60000 });
  await wait(page, 500);
  await page.locator('input[autocomplete="username"]').fill('admin');
  await page.locator('input[autocomplete="current-password"]').fill('admin123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 60000 });
  await wait(page, 3500);
}

async function openNav(page, label) {
  await page.getByRole('link', { name: label, exact: true }).click();
  await wait(page, 4500);
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 },
    locale: 'ar-EG',
    colorScheme: 'light',
  });
  const page = await context.newPage();

  try {
    console.log('Recording demo...');
    await login(page);

    await openNav(page, 'لوحة التحكم');
    await openNav(page, 'نقطة البيع');

    const cards = page.locator('.grid.grid-cols-3 > button');
    if (await cards.first().isVisible({ timeout: 8000 }).catch(() => false)) {
      await cards.nth(0).click();
      await wait(page, 1200);
      if ((await cards.count()) > 1) {
        await cards.nth(1).click();
        await wait(page, 1200);
      }
    }
    await wait(page, 3500);

    await openNav(page, 'المنتجات');
    await openNav(page, 'المخزون');
    await openNav(page, 'المشتريات');
    await openNav(page, 'العملاء');
    await openNav(page, 'التقارير');
    await openNav(page, 'الإعدادات');
    await openNav(page, 'لوحة التحكم');
    await wait(page, 2500);
  } finally {
    const video = page.video();
    await page.close();
    await context.close();
    await browser.close();

    if (!video) {
      throw new Error('No video recorded');
    }

    const rawPath = await video.path();
    if (fs.existsSync(WEBM_OUT)) fs.unlinkSync(WEBM_OUT);
    fs.renameSync(rawPath, WEBM_OUT);
    console.log('WEBM:' + WEBM_OUT);

    try {
      execSync(
        `ffmpeg -y -i "${WEBM_OUT}" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -movflags +faststart "${MP4_OUT}"`,
        { stdio: 'pipe' },
      );
      console.log('MP4:' + MP4_OUT);
    } catch {
      console.log('MP4:skipped (ffmpeg not available — use WEBM or convert manually)');
    }
  }
})().catch((err) => {
  console.error('DEMO_FAIL:', err);
  process.exit(1);
});
