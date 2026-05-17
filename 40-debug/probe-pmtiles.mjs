import { PMTiles } from "pmtiles";

const url =
  "http://localhost:8765/gaiku-kijunten-viewer/data/pmtiles/detail/sokuchiseika2011_zone09.pmtiles";
const p = new PMTiles(url);
const h = await p.getHeader();
console.log("header", { minZoom: h.minZoom, maxZoom: h.maxZoom, center: h.center });

function lonLatToTile(lon, lat, z) {
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180),
      ) /
        Math.PI) /
      2) *
      n,
  );
  return { x, y };
}

const points = [
  ["zone-center", 139.947, 36.434],
  ["tokyo", 139.75, 35.68],
  ["bounds-mid", 139.9475, 36.4208],
];
const z = 16;
for (const [name, lon, lat] of points) {
  const { x, y } = lonLatToTile(lon, lat, z);
  const tile = await p.getZxy(z, x, y);
  const yTms = (1 << z) - 1 - y;
  const tileTms = await p.getZxy(z, x, yTms);
  console.log(
    name,
    { x, y, yTms },
    tile?.data ? `xyz=${tile.data.byteLength}b` : "xyz=empty",
    tileTms?.data ? `tms=${tileTms.data.byteLength}b` : "tms=empty",
  );
}
