import type { Geometry } from "geojson";

export const DEFAULT_3DDB_DISCLAIMER_JA =
  "3DDB API利用時は産総研の利用規約・免責事項が適用されます。";

export interface DddbConfig {
  enabled: boolean;
  apiBaseUrl: string;
  copcViewerBaseUrl: string;
  maxFeatures: number;
  debounceMs: number;
  disclaimerJa?: string;
}

export interface DddbExternalLink {
  external_link: string;
  external_link_type: string;
}

export interface DddbFeatureProperties {
  reg_id: number;
  service_name: string;
  creation_date?: string;
  creation_date_end?: string;
  title: string;
  location?: string;
  group?: string;
  license?: string;
  description?: string;
  "3dtiles_url"?: string;
  downloadable: boolean;
  author?: string;
  external_link?: string;
  external_link_type?: string;
  external_links?: DddbExternalLink[];
}

export interface DddbApiFeature {
  type: "FeatureCollection";
  geometries?: Geometry[];
  properties: DddbFeatureProperties;
}

export interface DddbFeatureCollection {
  type: "FeatureCollection";
  properties: {
    all: number;
    num: number;
  };
  features: DddbApiFeature[];
}

export interface DddbCatalogEntry {
  regId: number;
  title: string;
  serviceName: string;
  license: string;
  downloadable: boolean;
  properties: DddbFeatureProperties;
}

export type DddbDownloadAction =
  | { kind: "zip"; url: string; label: string }
  | { kind: "copc"; url: string; label: string }
  | { kind: "external"; url: string; label: string }
  | { kind: "none"; label: string };
