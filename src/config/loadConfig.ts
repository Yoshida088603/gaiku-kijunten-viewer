import type { DddbConfig } from "@/3ddb/types";
import type { KijyuntenStyleConfig, MapConfig } from "@/data/types";

const base = import.meta.env.BASE_URL;

export function configUrl(path: string): string {
  return `${base}${path.replace(/^\//, "")}`;
}

export function dataUrl(relativePath: string): string {
  const dev = import.meta.env.DEV;
  const rel = relativePath.replace(/^\//, "");
  if (dev) {
    return `/data/${rel}`;
  }
  return `${base}data/${rel}`;
}

export async function loadMapConfig(): Promise<MapConfig> {
  const res = await fetch(configUrl("config/map.json"));
  if (!res.ok) throw new Error(`map.json: ${res.status}`);
  return res.json() as Promise<MapConfig>;
}

export async function loadStyleConfig(): Promise<KijyuntenStyleConfig> {
  const res = await fetch(configUrl("config/kijyunten-style.json"));
  if (!res.ok) throw new Error(`kijyunten-style.json: ${res.status}`);
  return res.json() as Promise<KijyuntenStyleConfig>;
}

export async function load3ddbConfig(): Promise<DddbConfig> {
  const res = await fetch(configUrl("config/3ddb.json"));
  if (!res.ok) throw new Error(`3ddb.json: ${res.status}`);
  return res.json() as Promise<DddbConfig>;
}
