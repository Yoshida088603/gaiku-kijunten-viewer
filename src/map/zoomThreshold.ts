const ZOOM_EPSILON = 0.01;

function meetsMinZoom(zoom: number, minZoom: number): boolean {
  return zoom >= minZoom - ZOOM_EPSILON;
}

export function isDetailZoom(zoom: number, detailMinZoom: number): boolean {
  return meetsMinZoom(zoom, detailMinZoom);
}

export function isDownloadZoom(zoom: number, downloadMinZoom: number): boolean {
  return meetsMinZoom(zoom, downloadMinZoom);
}
