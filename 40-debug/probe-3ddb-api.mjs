/**
 * 3DDB API 疎通確認（フェーズ 0）
 * Usage: node 40-debug/probe-3ddb-api.mjs
 */
const API_BASE = "https://gsvrg.ipri.aist.go.jp/3ddb_demo/api/v1";

// 東京 bbox: 139.70–139.80, 35.65–35.72
const WKT =
  "POLYGON((139.70 35.65,139.80 35.65,139.80 35.72,139.70 35.72,139.70 35.65))";

const url = `${API_BASE}/services/ALL/features?area=${encodeURIComponent(WKT)}&limit=5`;

console.log("GET", url);

const res = await fetch(url);
console.log("status:", res.status, res.statusText);

if (!res.ok) {
  const text = await res.text();
  console.error("body:", text.slice(0, 500));
  process.exit(1);
}

const data = await res.json();
console.log("type:", data.type);
console.log("properties.all:", data.properties?.all);
console.log("properties.num:", data.properties?.num);
console.log("features.length:", data.features?.length ?? 0);

if (data.features?.length > 0) {
  const f0 = data.features[0];
  console.log("features[0].properties:", JSON.stringify(f0.properties, null, 2));
  console.log("features[0].geometries:", f0.geometries ? `${f0.geometries.length} item(s)` : "none");
  if (f0.geometries?.[0]) {
    console.log("geometries[0].type:", f0.geometries[0].type);
  }
}

if (res.status !== 200 || !data.features?.length) {
  console.error("FAIL: expected status 200 and >= 1 feature");
  process.exit(1);
}

console.log("OK: 3DDB API responded with", data.features.length, "feature(s)");
