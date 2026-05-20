/** 国土地理院 住所検索 API（msearch.gsi.go.jp） */

export const DEFAULT_GSI_ADDRESS_SEARCH_URL =
  "https://msearch.gsi.go.jp/address-search/AddressSearch";

export interface GsiAddressHit {
  title: string;
  lng: number;
  lat: number;
}

interface GsiFeatureProperties {
  title?: string;
}

interface GsiFeatureGeometry {
  type?: string;
  coordinates?: unknown;
}

interface GsiFeature {
  type?: string;
  properties?: GsiFeatureProperties;
  geometry?: GsiFeatureGeometry;
}

function parseHit(feature: GsiFeature): GsiAddressHit | null {
  const coords = feature.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  const title = feature.properties?.title?.trim();
  if (!title) return null;
  return { title, lng, lat };
}

export async function searchGsiAddress(
  query: string,
  baseUrl: string = DEFAULT_GSI_ADDRESS_SEARCH_URL,
): Promise<GsiAddressHit[]> {
  const q = query.trim();
  if (!q) {
    throw new Error("住所を入力してください");
  }

  const url = new URL(baseUrl);
  url.searchParams.set("q", q);

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch {
    throw new Error("住所検索に接続できませんでした（ネットワークを確認してください）");
  }

  if (!res.ok) {
    throw new Error(`住所検索 API エラー（${res.status}）`);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error("住所検索の応答を読み取れませんでした");
  }

  if (!Array.isArray(data)) {
    throw new Error("住所検索の応答形式が不正です");
  }

  const hits: GsiAddressHit[] = [];
  for (const item of data) {
    const hit = parseHit(item as GsiFeature);
    if (hit) hits.push(hit);
  }
  return hits;
}
