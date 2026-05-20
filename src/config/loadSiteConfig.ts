import type { SiteConfig } from "@/data/types";
import { configUrl } from "@/config/loadConfig";

export async function loadSiteConfig(): Promise<SiteConfig> {
  const res = await fetch(configUrl("config/site.json"));
  if (!res.ok) throw new Error(`site.json: ${res.status}`);
  return res.json() as Promise<SiteConfig>;
}
