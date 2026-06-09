/**
 * Mobile layout probe: scroll + viewport after address input focus.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const LOG = path.resolve("debug-d9bc3f.log");
const CANDIDATES = [
  "http://localhost:5173/gaiku-kijunten-viewer/?e2e=1",
  "http://localhost:8765/gaiku-kijunten-viewer/?e2e=1",
];

function appendLog(entry) {
  fs.appendFileSync(LOG, `${JSON.stringify(entry)}\n`, "utf8");
}

async function pickUrl() {
  for (const base of CANDIDATES) {
    try {
      const origin = base.replace(/\?.*$/, "");
      const res = await fetch(`${origin}/config/map.json`);
      if (res.ok) return base;
    } catch {
      /* next */
    }
  }
  return null;
}

const url = await pickUrl();
if (!url) {
  console.error("No dev server");
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector("#address-search-input", { timeout: 30000 });

const snap = async (phase) =>
  page.evaluate((p) => {
    const vv = window.visualViewport;
    const input = document.getElementById("address-search-input");
    const dl = document.getElementById("download-wrap");
    const dlRect = dl?.getBoundingClientRect();
    return {
      phase: p,
      inputFontSize: input ? getComputedStyle(input).fontSize : null,
      vvScale: vv?.scale ?? 1,
      vvWidth: vv?.width ?? null,
      vvHeight: vv?.height ?? null,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      innerWidth: window.innerWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      htmlClass: document.documentElement.className,
      downloadBottom: dlRect?.bottom ?? null,
      downloadRight: dlRect?.right ?? null,
      viewportMeta: document
        .querySelector('meta[name="viewport"]')
        ?.getAttribute("content"),
    };
  }, phase);

for (const phase of ["before", "focused", "blur"]) {
  if (phase === "focused") await page.focus("#address-search-input");
  if (phase === "blur") await page.evaluate(() => document.activeElement?.blur());
  await page.waitForTimeout(phase === "focused" ? 200 : 100);
  const data = await snap(phase);
  appendLog({
    sessionId: "d9bc3f",
    runId: "playwright-scroll",
    hypothesisId: phase === "focused" ? "E" : "F",
    location: "verify-mobile-scroll.mjs",
    message: phase,
    data,
    timestamp: Date.now(),
  });
  console.log(phase, data);
}

await browser.close();
console.log("wrote", LOG);
