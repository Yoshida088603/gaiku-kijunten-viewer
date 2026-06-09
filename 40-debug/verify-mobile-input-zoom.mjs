/**
 * Mobile viewport / input font-size probe (iOS auto-zoom diagnostic).
 * Usage: node 40-debug/verify-mobile-input-zoom.mjs
 */
import { chromium, webkit } from "playwright";
import fs from "node:fs";
import path from "node:path";

const LOG = path.resolve("debug-d9bc3f.log");
const CANDIDATES = [
  "http://localhost:5173/gaiku-kijunten-viewer/?e2e=1",
  "http://localhost:8765/gaiku-kijunten-viewer/?e2e=1",
];

async function pickUrl() {
  for (const base of CANDIDATES) {
    const origin = base.replace(/\?.*$/, "");
    try {
      const res = await fetch(`${origin}/config/map.json`);
      if (res.ok) return base;
    } catch {
      /* next */
    }
  }
  return null;
}

function appendLog(entry) {
  fs.appendFileSync(LOG, `${JSON.stringify(entry)}\n`, "utf8");
}

async function probe(browserType, label, url) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({
    ...browserType.devices?.["iPhone 12"],
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("#address-search-input", { timeout: 30000 });

  const before = await page.evaluate(() => {
    const input = document.getElementById("address-search-input");
    const style = input ? getComputedStyle(input) : null;
    const vv = window.visualViewport;
    return {
      inputFontSize: style?.fontSize ?? null,
      innerWidth: window.innerWidth,
      clientWidth: document.documentElement.clientWidth,
      vvScale: vv?.scale ?? 1,
      vvWidth: vv?.width ?? null,
    };
  });

  await page.focus("#address-search-input");
  await page.waitForTimeout(300);

  const focused = await page.evaluate(() => {
    const input = document.getElementById("address-search-input");
    const style = input ? getComputedStyle(input) : null;
    const vv = window.visualViewport;
    return {
      inputFontSize: style?.fontSize ?? null,
      innerWidth: window.innerWidth,
      clientWidth: document.documentElement.clientWidth,
      vvScale: vv?.scale ?? 1,
      vvWidth: vv?.width ?? null,
      active: document.activeElement?.id ?? null,
    };
  });

  await browser.close();

  const ts = Date.now();
  appendLog({
    sessionId: "d9bc3f",
    runId: "playwright-probe",
    hypothesisId: "A",
    location: "verify-mobile-input-zoom.mjs",
    message: `${label} before focus`,
    data: { label, phase: "before", ...before },
    timestamp: ts,
  });
  appendLog({
    sessionId: "d9bc3f",
    runId: "playwright-probe",
    hypothesisId: "A",
    location: "verify-mobile-input-zoom.mjs",
    message: `${label} after focus`,
    data: { label, phase: "focused", ...focused },
    timestamp: ts + 1,
  });

  console.log(label, "before:", before, "focused:", focused);
  return { before, focused };
}

const url = await pickUrl();
if (!url) {
  console.error("No dev server. Start: npm run dev");
  process.exit(1);
}

const chromiumResult = await probe(chromium, "chromium-iphone", url);
try {
  await probe(webkit, "webkit-iphone", url);
} catch (e) {
  console.warn("webkit skipped:", e.message);
}

const px = parseFloat(chromiumResult.before.inputFontSize);
if (px < 16) {
  console.log(`FAIL probe: input font-size ${px}px < 16px (iOS auto-zoom risk)`);
  process.exit(2);
}
console.log("PASS probe: input font-size >= 16px");
