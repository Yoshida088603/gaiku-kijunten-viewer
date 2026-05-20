/**
 * Headless test: CSV download enabled at z16+, locked below z16.
 * Usage: node 40-debug/verify-download-zoom.mjs
 * Server: Vite :5173 or local :8765 (auto-detect)
 */
import { chromium } from "playwright";

const CANDIDATES = [
  "http://localhost:5173/gaiku-kijunten-viewer/?e2e=1",
  "http://localhost:8765/gaiku-kijunten-viewer/?e2e=1",
];

const TOKYO_CENTER = [139.75, 35.68];
const errors = [];

async function pickUrl() {
  for (const base of CANDIDATES) {
    const origin = base.replace(/\?.*$/, "");
    try {
      const res = await fetch(`${origin}/config/map.json`);
      if (!res.ok) continue;
      const cfg = await res.json();
      if (cfg.downloadMinZoom !== 16) {
        console.error(`map.json downloadMinZoom=${cfg.downloadMinZoom}, expected 16`);
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
    const t = document.getElementById("status-bar")?.innerText ?? "";
    return /系:.*（自動）/.test(t) && !/系未選択/.test(t);
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

// detail 表示 + タイル読込（自動 flyTo は z5 のままのため手動で z13+ へ）
await setView(15.9);

await page.waitForFunction(
  () => {
    const t = document.getElementById("status-bar")?.innerText ?? "";
    return /detail表示/.test(t);
  },
  { timeout: 30_000 },
);

const low = await page.evaluate(() => window.__gaikuViewerTest.getDownloadUi());
const zoomLow = await page.evaluate(() => window.__gaikuViewerTest.getZoom());
console.log("z15.9:", low, "mapZoom:", zoomLow.toFixed(2));
assert(zoomLow < 16, `expected zoom < 16, got ${zoomLow}`);
assert(!low.wrapHidden, "download wrap should be visible with detail");
assert(low.btnDisabled, "button must be disabled below z16");
assert(/z16以上に拡大/.test(low.hint), `locked hint: ${low.hint}`);
assert(/z16以上でDL可/.test(low.statusDl), `status: ${low.statusDl}`);

await setView(16);

await page.waitForFunction(
  () => {
    const ui = window.__gaikuViewerTest.getDownloadUi();
    const z = window.__gaikuViewerTest.getZoom();
    return z >= 15.99 && !ui.btnDisabled;
  },
  { timeout: 45_000 },
);

const high = await page.evaluate(() => window.__gaikuViewerTest.getDownloadUi());
const zoomHigh = await page.evaluate(() => window.__gaikuViewerTest.getZoom());
console.log("z16:", high, "mapZoom:", zoomHigh.toFixed(2));
assert(zoomHigh >= 15.99, `map zoom should be >=16, got ${zoomHigh}`);
assert(!high.wrapHidden, "download wrap visible at z16");
assert(!/z16以上に拡大/.test(high.hint), `should not show locked hint: ${high.hint}`);
assert(high.btnDisabled === false, `CSV download must be enabled at z16: ${high.hint}`);
assert(
  /表示範囲.*点/.test(high.statusDl) || /点をダウンロード/.test(high.hint),
  `DL ready: status=${high.statusDl} hint=${high.hint}`,
);

const critical = errors.filter(
  (e) => !/favicon/i.test(e) && !/Failed to load resource.*404/i.test(e),
);
if (critical.length) console.warn("console errors:", critical.slice(0, 5));

await browser.close();
console.log("PASS: download locked below z16, enabled at z16+");
process.exit(0);
