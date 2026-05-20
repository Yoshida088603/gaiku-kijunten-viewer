export interface SiteHelpSection {
  heading: string;
  items: string[];
}

export interface SiteHelpConfig {
  sections: SiteHelpSection[];
  dataSourceUrl: string;
  dataSourceLabel: string;
  repoUrl: string;
  repoLabel: string;
}

/** 地図左下のお問い合わせ案内 */
export interface SiteContactConfig {
  /** ビュワー向け（X）の短い説明 */
  viewerLine: string;
  xUrl: string;
  xLabel: string;
  /** 原本データ向け（国土交通省）の短い説明 */
  dataLine: string;
  mlitUrl: string;
  mlitLabel: string;
}

export interface SiteConfig {
  title: string;
  description: string;
  /** 凡例パネル下部に常時表示する短い注意書き */
  panelNotice?: string;
  help: SiteHelpConfig;
  contact?: SiteContactConfig;
}

export interface MapConfig {
  detailMinScale: number;
  downloadMinScale: number;
  detailMinZoom: number;
  downloadMinZoom: number;
  overviewMaxZoom: number;
  dataBaseUrl: string;
  gsiStdUrl: string;
  gsiAttribution: string;
  /** 国土地理院 住所検索 API（省略時は gsiAddressSearch のデフォルト URL） */
  gsiAddressSearchUrl?: string;
  defaultCenter: [number, number];
  defaultZoom: number;
  defaultZone: number;
  detailSourceLayer: string;
  csvColumns: string[];
}

export interface StyleCategory {
  label: string;
  glyph: string;
  color: string;
  icon: string;
  kinds: string[];
  sizeRatio: number;
  legendSizePx: number;
  order: number;
}

export interface KijyuntenStyleConfig {
  markerReferenceScale?: number;
  markerSizeM?: number;
  markerSizeMmRef?: number;
  svgPixelSize?: number;
  categories: StyleCategory[];
}

export interface ManifestLayer {
  gpkg?: string;
  pmtiles: string;
  path: string;
  bytes?: number;
  zone: number;
  sokuti: string;
  epsg: number;
  csv_prefix: string | null;
  split?: boolean;
}

export interface OverviewGridLevel {
  level: number;
  cell_deg: number;
  minzoom: number;
  maxzoom: number;
  layer_name: string;
  cells?: number;
}

export interface ManifestOverview {
  path: string;
  pmtiles?: string;
  minzoom: number;
  maxzoom: number;
  grid_levels: OverviewGridLevel[];
}

export interface Manifest {
  layers: ManifestLayer[];
  overview?: ManifestOverview;
  errors?: string[];
}

export interface LogicalZoneLayer {
  zone: number;
  sokuti: string;
  epsg: number;
  label: string;
  tiles: ManifestLayer[];
}

export interface KijyuntenFeatureProps {
  id?: string;
  name?: string;
  x?: number | string;
  y?: number | string;
  z?: number | string;
  kind?: string;
  dataset_name_ja?: string;
  data_system?: string;
  sokuti?: string;
  zone?: number | string;
  epsg?: number | string;
  yohosei?: number | string;
  n?: number;
}
