import type { DddbConfig, DddbFeatureCollection } from "@/3ddb/types";

export interface FetchFeaturesOptions {
  signal?: AbortSignal;
  limit?: number;
  offset?: number;
}

export async function fetchFeaturesInArea(
  config: DddbConfig,
  wkt: string,
  opts: FetchFeaturesOptions = {},
): Promise<DddbFeatureCollection> {
  const limit = opts.limit ?? config.maxFeatures;
  const params = new URLSearchParams({
    area: wkt,
    limit: String(limit),
  });
  if (opts.offset != null && opts.offset > 0) {
    params.set("offset", String(opts.offset));
  }

  const url = `${config.apiBaseUrl.replace(/\/$/, "")}/services/ALL/features?${params}`;
  const res = await fetch(url, { signal: opts.signal });
  if (!res.ok) {
    throw new Error(`3DDB API: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<DddbFeatureCollection>;
}
