import puppeteer from 'puppeteer';
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';
const width = Number(process.argv[4] || 1440);
const height = Number(process.argv[5] || 900);

const OUT = './temporary screenshots';
await mkdir(OUT, { recursive: true });

// auto-increment index
let n = 1;
try {
  const files = await readdir(OUT);
  const nums = files
    .map((f) => f.match(/^screenshot-(\d+)/))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  if (nums.length) n = Math.max(...nums) + 1;
} catch {}

const name = `screenshot-${n}${label ? '-' + label : ''}.png`;
const path = join(OUT, name);

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-color-profile=srgb'],
});
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

// scroll through the page to trigger IntersectionObserver reveals, then back to top
await page.evaluate(async () => {
  const step = window.innerHeight * 0.8;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  // ensure every reveal element is in its final state for the capture
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 200));
});

await new Promise((r) => setTimeout(r, 600)); // let fonts/animation settle
await page.screenshot({ path, fullPage: true });
await browser.close();
console.log(`Saved ${path} (${width}x${height})`);
