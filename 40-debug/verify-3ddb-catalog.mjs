/**
 * Headless test: 3DDB catalog visible at downloadMinZoom+, hidden below.
 * Usage: node 40-debug/verify-3ddb-catalog.mjs
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
      const dddbRes = await fetch(`${origin}/config/3ddb.json`);
      if (!dddbRes.ok) continue;
      const dddb = await dddbRes.json();
      if (!dddb.enabled) {
        console.error("3ddb.json enabled=false");
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

const low3ddb = await page.evaluate(() => window.__gaikuViewerTest.get3ddbUi());
console.log(`z${belowZoom} 3ddb:`, low3ddb);
assert(low3ddb.wrapHidden, "3DDB catalog should be hidden below z14");

await setView(atZoom);

await page.waitForFunction(
  () => {
    const ui = window.__gaikuViewerTest.get3ddbUi();
    return !ui.wrapHidden && ui.optionCount > 0;
  },
  { timeout: 60_000 },
);

const high3ddb = await page.evaluate(() => window.__gaikuViewerTest.get3ddbUi());
const zoomHigh = await page.evaluate(() => window.__gaikuViewerTest.getZoom());
console.log(`z${atZoom} 3ddb:`, high3ddb, "mapZoom:", zoomHigh.toFixed(2));

assert(zoomHigh >= MIN_ZOOM - 0.01, `expected zoom >= ${MIN_ZOOM}, got ${zoomHigh}`);
assert(!high3ddb.wrapHidden, "3DDB catalog should be visible at z14+");
assert(high3ddb.optionCount > 0, `expected options > 0, got ${high3ddb.optionCount}`);
assert(
  high3ddb.selectedRegId != null,
  `expected selected reg_id, got ${high3ddb.selectedRegId}`,
);
assert(high3ddb.toggleChecked, "3DDB toggle should default to checked");

const fillLayer = await page.evaluate(() => {
  const mapEl = document.getElementById("map");
  return mapEl != null;
});
assert(fillLayer, "map element should exist");

await browser.close();

if (errors.length > 0) {
  console.warn("console errors:", errors.slice(0, 5));
}

console.log("PASS: 3DDB catalog verify");
