/**
 * ローカルサーバ上のビュワーを表示しスクリーンショットを保存。
 * Usage: node 40-debug/visualize-local.mjs  (serve.mjs on :8765)
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const URL = "http://localhost:8765/gaiku-kijunten-viewer/?e2e=1";
const OUT = path.join(__dirname, "screenshots", "local-restart-zone09.png");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(URL, { waitUntil: "networkidle", timeout: 120_000 });
await page.waitForTimeout(3000);

// 第9系（東京）へ移動・拡大（以前の検証エリア付近）
await page.evaluate(async () => {
  const api = window.__gaikuViewerTest;
  if (api) await api.setZoom(16, [139.77, 35.66]);
});
await page.waitForTimeout(6000);

const status = await page.locator("#status-details-inner").evaluate((el) => el.textContent ?? "");
await page.screenshot({ path: OUT, fullPage: false });

console.log("screenshot:", OUT);
console.log("statusBar:", status.replace(/\n/g, " | "));

await browser.close();
