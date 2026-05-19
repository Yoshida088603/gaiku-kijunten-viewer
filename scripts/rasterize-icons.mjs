/**
 * public/icons/*.svg → icon-XX.png（ASCII 名）を生成。MapLibre 用。
 * 凡例は DOM 描画のため本スクリプトの成果物に依存しない。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = path.join(root, "public", "icons");
const stylePath = path.join(root, "public", "config", "kijyunten-style.json");
const PX = 64;

function iconPngId(order) {
  return `icon-${String(order).padStart(2, "0")}.png`;
}

async function rasterize(srcSvg, destPng) {
  const svg = fs.readFileSync(srcSvg, "utf8");
  await sharp(Buffer.from(svg), { density: 192 })
    .resize(PX, PX)
    .png()
    .toFile(destPng);
}

async function main() {
  const style = JSON.parse(fs.readFileSync(stylePath, "utf8"));
  for (const cat of style.categories) {
    const src = path.join(iconsDir, cat.icon);
    const dest = path.join(iconsDir, iconPngId(cat.order));
    if (!fs.existsSync(src)) {
      console.warn(`skip missing ${cat.icon}`);
      continue;
    }
    await rasterize(src, dest);
    console.log(`rasterized ${cat.icon} -> ${path.basename(dest)}`);
  }

  const fallbackSvg = path.join(iconsDir, "fallback.svg");
  const fallbackPng = path.join(iconsDir, "icon-fallback.png");
  if (fs.existsSync(fallbackSvg)) {
    await rasterize(fallbackSvg, fallbackPng);
    console.log("rasterized fallback.svg -> icon-fallback.png");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
