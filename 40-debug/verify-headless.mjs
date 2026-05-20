/**
 * Headless smoke test: load viewer, wait for detail tiles, report console/map errors.
 * Usage: node 40-debug/verify-headless.mjs  (server must be on :8765)
 */
import { chromium } from "playwright";

const URL = "http://localhost:8765/gaiku-kijunten-viewer/";
const errors = [];
const pmtilesReqs = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("request", (req) => {
  const u = req.url();
  if (u.includes("zone09") || u.includes("detail/sokuchi")) pmtilesReqs.push(u);
});
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(String(err)));

await page.goto(URL, { waitUntil: "networkidle", timeout: 120_000 });
await page.waitForTimeout(12_000);

const status = await page.locator("#status-details-inner").evaluate((el) => el.textContent ?? "");
const hasExprErr = errors.some((e) =>
  /zoom.*expression may only be used/i.test(e),
);
const hasLayerMissing = errors.some((e) =>
  /does not exist in the map's style/i.test(e),
);

const loadedMatch = status.match(/読込 約(\d+)点/);
const loaded = loadedMatch ? Number(loadedMatch[1]) : -1;

console.log("statusBar:", status.replace(/\n/g, " | "));
console.log("loaded:", loaded);
console.log("pmtilesReqs:", pmtilesReqs.length);
console.log("consoleErrors:", errors.length);
console.log("exprError:", hasExprErr);
console.log("layerMissing:", hasLayerMissing);
if (errors.length) console.log("sample:", errors.slice(0, 5).join("\n"));

await browser.close();
const ok =
  !hasExprErr &&
  !hasLayerMissing &&
  pmtilesReqs.length > 0 &&
  loaded > 0;
process.exit(ok ? 0 : 1);
