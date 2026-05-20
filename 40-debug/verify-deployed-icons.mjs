const base = "https://yoshida088603.github.io/gaiku-kijunten-viewer/icons";
const svgRes = await fetch(`${base}/icon-ho.svg`);
const svg = await svgRes.text();
const m = svg.match(/>([^<]+)<\/text>/);
console.log("svg status:", svgRes.status);
console.log("has Noto:", svg.includes("Noto Sans CJK JP"));
console.log("glyph:", m ? m[1] : "?");
console.log("is 補:", m?.[1] === "補");
console.log("has hex literal 88DC:", />\s*88DC\s*</.test(svg));

const pngRes = await fetch(`${base}/icon-01.png`);
const png = await pngRes.arrayBuffer();
console.log("png status:", pngRes.status, "bytes:", png.byteLength);
