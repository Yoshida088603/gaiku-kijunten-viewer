/**
 * Headless test: CSV download enabled at downloadMinZoom+, locked below.
 * Usage: node 40-debug/verify-download-zoom.mjs
 * Server: Vite :5173 or local :8765 (auto-detect)
 */
import { chromium } from "playwright";

const CANDIDATES = [
  "http://localhost:5173/gaiku-kijunten-viewer/?e2e=1",
  "http://localhost:8765/gaiku-kijunten-viewer/?e2e=1",
];

const TOKYO_CENTER = [139.75, 35.68];
const MIN_ZOOM = 14;
const errors = [];

async function pickUrl() {
  for (const base of CANDIDATES) {
    const origin = base.replace(/\?.*$/, "");
    try {
      const res = await fetch(`${origin}/config/map.json`);
      if (!res.ok) continue;
      const cfg = await res.json();
      if (cfg.downloadMinZoom !== MIN_ZOOM) {
        console.error(
          `map.json downloadMinZoom=${cfg.downloadMinZoom}, expected ${MIN_ZOOM}`,
        );
        return null;
      }
      return base;
    } catch {
      /* try next */
    }
  }
  return null;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(String(err)));

const URL = await pickUrl();
if (!URL) {
  console.error("No server reachable on :5173 or :8765");
  process.exit(1);
}
console.log("URL:", URL);

await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60_000 });

await page.waitForFunction(
  () => window.__gaikuViewerTest != null,
  { timeout: 60_000 },
);

await page.waitForFunction(
  () => {
    const t = document.getElementById("status-details-inner")?.textContent ?? "";
    return /座標: 測地成果2011・\d+系（EPSG\d+）/.test(t);
  },
  { timeout: 60_000 },
);

const setView = async (zoom) => {
  await page.evaluate(
    async ({ zoom, center }) => {
      await window.__gaikuViewerTest.setZoom(zoom, center);
    },
    { zoom, center: TOKYO_CENTER },
  );
  await page.waitForTimeout(1500);
};

const belowZoom = MIN_ZOOM - 0.1;
const atZoom = MIN_ZOOM;

await setView(belowZoom);

await page.waitForFunction(
  () => {
    const t = document.getElementById("status-details-inner")?.textContent ?? "";
    return /CSV: ズーム\d+以上で利用可/.test(t);
  },
  { timeout: 30_000 },
);

const low = await page.evaluate(() => window.__gaikuViewerTest.getDownloadUi());
const zoomLow = await page.evaluate(() => window.__gaikuViewerTest.getZoom());
console.log(`z${belowZoom}:`, low, "mapZoom:", zoomLow.toFixed(2));
assert(zoomLow < MIN_ZOOM, `expected zoom < ${MIN_ZOOM}, got ${zoomLow}`);
assert(!low.wrapHidden, "download wrap should be visible with detail");
assert(low.btnDisabled, `button must be disabled below z${MIN_ZOOM}`);
assert(
  new RegExp(`z${MIN_ZOOM}以上に拡大`).test(low.hint),
  `locked hint: ${low.hint}`,
);
assert(
  new RegExp(`CSV: ズーム${MIN_ZOOM}以上で利用可`).test(low.statusDl),
  `status: ${low.statusDl}`,
);

await setView(atZoom);

await page.waitForFunction(
  ({ minZ }) => {
    const ui = window.__gaikuViewerTest.getDownloadUi();
    const z = window.__gaikuViewerTest.getZoom();
    return z >= minZ - 0.01 && !ui.btnDisabled;
  },
  { minZ: MIN_ZOOM },
  { timeout: 45_000 },
);

const high = await page.evaluate(() => window.__gaikuViewerTest.getDownloadUi());
const zoomHigh = await page.evaluate(() => window.__gaikuViewerTest.getZoom());
console.log(`z${atZoom}:`, high, "mapZoom:", zoomHigh.toFixed(2));
assert(
  zoomHigh >= MIN_ZOOM - 0.01,
  `map zoom should be >=${MIN_ZOOM}, got ${zoomHigh}`,
);
assert(!high.wrapHidden, `download wrap visible at z${MIN_ZOOM}`);
assert(
  !new RegExp(`z${MIN_ZOOM}以上に拡大`).test(high.hint),
  `should not show locked hint: ${high.hint}`,
);
assert(
  high.btnDisabled === false,
  `CSV download must be enabled at z${MIN_ZOOM}: ${high.hint}`,
);
assert(
  /CSV: 表示範囲 \d+ 点/.test(high.statusDl) || /点をダウンロード/.test(high.hint),
  `CSV ready: status=${high.statusDl} hint=${high.hint}`,
);

const critical = errors.filter(
  (e) => !/favicon/i.test(e) && !/Failed to load resource.*404/i.test(e),
);
if (critical.length) console.warn("console errors:", critical.slice(0, 5));

await browser.close();
console.log(
  `PASS: download locked below z${MIN_ZOOM}, enabled at z${MIN_ZOOM}+`,
);
process.exit(0);
