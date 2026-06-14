import type { Feature, FeatureCollection, Geometry } from "geojson";
import type {
  DddbApiFeature,
  DddbCatalogEntry,
  DddbFeatureCollection,
} from "@/3ddb/types";

function pickGeometry(feature: DddbApiFeature): Geometry | null {
  const geometries = feature.geometries;
  if (!geometries?.length) return null;
  if (geometries.length === 1) return geometries[0];
  return {
    type: "GeometryCollection",
    geometries,
  };
}

export function toCatalogEntry(feature: DddbApiFeature): DddbCatalogEntry | null {
  if (!pickGeometry(feature)) return null;
  const p = feature.properties;
  return {
    regId: p.reg_id,
    title: p.title,
    serviceName: p.service_name,
    license: p.license ?? "",
    downloadable: p.downloadable,
    properties: p,
  };
}

export function toMapGeoJson(
  collection: DddbFeatureCollection,
): FeatureCollection {
  const features: Feature[] = [];
  for (const apiFeature of collection.features) {
    const geometry = pickGeometry(apiFeature);
    if (!geometry) continue;
    features.push({
      type: "Feature",
      geometry,
      properties: {
        reg_id: apiFeature.properties.reg_id,
        service_name: apiFeature.properties.service_name,
        title: apiFeature.properties.title,
      },
    });
  }
  return { type: "FeatureCollection", features };
}

export function entriesFromCollection(
  collection: DddbFeatureCollection,
): DddbCatalogEntry[] {
  return collection.features
    .map(toCatalogEntry)
    .filter((e): e is DddbCatalogEntry => e !== null);
}
