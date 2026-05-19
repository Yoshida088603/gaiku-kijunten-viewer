import { dataUrl } from "@/config/loadConfig";
import type {
  LogicalZoneLayer,
  Manifest,
  ManifestLayer,
  ManifestOverview,
} from "@/data/types";

const SOKUTI_LABEL: Record<string, string> = {
  "2011": "測地成果2011",
  sonota: "測地成果その他",
};

function zoneLabel(zone: number): string {
  return `第${zone}系`;
}

function layerLabel(sokuti: string, zone: number, epsg: number): string {
  const sj = SOKUTI_LABEL[sokuti] ?? sokuti;
  return `${sj}・${zoneLabel(zone)}（EPSG:${epsg}）`;
}

function isOverviewPath(path: string): boolean {
  return path.includes("pmtiles/overview/");
}

function isDetailPath(path: string): boolean {
  return path.includes("pmtiles/detail/");
}

export async function fetchManifest(): Promise<Manifest> {
  const res = await fetch(dataUrl("manifest.json"));
  if (!res.ok) throw new Error(`manifest.json: ${res.status}`);
  return res.json() as Promise<Manifest>;
}

export function groupDetailLayers(layers: ManifestLayer[]): LogicalZoneLayer[] {
  const detail = layers.filter((l) => isDetailPath(l.path));
  const map = new Map<string, LogicalZoneLayer>();

  for (const layer of detail) {
    const key = `${layer.sokuti}:${layer.zone}`;
    let group = map.get(key);
    if (!group) {
      group = {
        zone: layer.zone,
        sokuti: layer.sokuti,
        epsg: layer.epsg,
        label: layerLabel(layer.sokuti, layer.zone, layer.epsg),
        tiles: [],
      };
      map.set(key, group);
    }
    group.tiles.push(layer);
  }

  return [...map.values()].sort((a, b) => {
    if (a.sokuti !== b.sokuti) return a.sokuti.localeCompare(b.sokuti);
    return a.zone - b.zone;
  });
}

export function getOverview(manifest: Manifest): ManifestOverview | null {
  if (manifest.overview?.path) {
    return manifest.overview;
  }
  const ovLayer = manifest.layers.find((l) => isOverviewPath(l.path));
  if (!ovLayer) return null;
  return {
    path: ovLayer.path,
    pmtiles: ovLayer.pmtiles,
    minzoom: 0,
    maxzoom: 13,
    grid_levels: [],
  };
}

export function pmtilesAbsoluteUrl(relativePath: string): string {
  const rel = relativePath.replace(/^\//, "");
  const httpUrl = new URL(dataUrl(rel), window.location.href).href;
  return `pmtiles://${httpUrl}`;
}

export function tileUrl(layer: ManifestLayer): string {
  return pmtilesAbsoluteUrl(layer.path);
}

export function overviewUrl(overview: ManifestOverview): string {
  return pmtilesAbsoluteUrl(overview.path);
}
