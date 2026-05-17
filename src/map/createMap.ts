import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import type { MapConfig } from "@/data/types";

let protocolRegistered = false;

export function registerPmtilesProtocol(): void {
  if (protocolRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  protocolRegistered = true;
}

export function createBaseMap(
  container: HTMLElement,
  config: MapConfig,
): maplibregl.Map {
  registerPmtilesProtocol();

  return new maplibregl.Map({
    container,
    style: {
      version: 8,
      glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
      sources: {
        gsi: {
          type: "raster",
          tiles: [config.gsiStdUrl],
          tileSize: 256,
          attribution: config.gsiAttribution,
          maxzoom: 18,
        },
      },
      layers: [
        {
          id: "gsi-raster",
          type: "raster",
          source: "gsi",
        },
      ],
    },
    center: config.defaultCenter,
    zoom: config.defaultZoom,
    maxZoom: 20,
    attributionControl: { compact: true },
  });
}
