/**
 * kijyunten-style.json から MapLibre 用 icon-*.svg を UTF-8 で生成する。
 * テンプレートは 60-csv2geopackage/kijyunten_style.py の _write_glyph_svg と同型。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = path.join(root, "public", "icons");
const stylePath = path.join(root, "public", "config", "kijyunten-style.json");

function fontSizeForGlyph(glyph) {
  const len = [...glyph].length;
  if (len <= 1) return 11;
  if (len === 2) return 9;
  return 8;
}

function buildGlyphSvg({ color, glyph, glyphColor = "#FFFFFF" }) {
  const fontSize = fontSizeForGlyph(glyph);
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">\n' +
    `  <circle cx="12" cy="12" r="10" fill="${color}" stroke="#333333" stroke-width="0.6"/>\n` +
    `  <text x="12" y="16" text-anchor="middle" font-size="${fontSize}" font-weight="bold"\n` +
    `        fill="${glyphColor}" font-family="Noto Sans CJK JP, Noto Sans CJK SC, MS Gothic, Meiryo, sans-serif">${glyph}</text>\n` +
    "</svg>\n"
  );
}

function main() {
  const style = JSON.parse(fs.readFileSync(stylePath, "utf8"));

  for (const cat of style.categories) {
    if (!cat.icon) {
      console.warn(`skip category without icon: ${cat.label}`);
      continue;
    }
    const dest = path.join(iconsDir, cat.icon);
    const svg = buildGlyphSvg({
      color: cat.color ?? "#999999",
      glyph: cat.glyph ?? "?",
    });
    fs.writeFileSync(dest, svg, "utf8");
    console.log(`wrote ${cat.icon} (${cat.glyph})`);
  }

  const fallbackGlyph = style.fallback_glyph ?? "？";
  const fallbackColor = style.fallback_color ?? "#999999";
  const fallbackPath = path.join(iconsDir, "fallback.svg");
  fs.writeFileSync(
    fallbackPath,
    buildGlyphSvg({ color: fallbackColor, glyph: fallbackGlyph }),
    "utf8",
  );
  console.log(`wrote fallback.svg (${fallbackGlyph})`);
}

main();
