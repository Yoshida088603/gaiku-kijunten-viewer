# -*- coding: utf-8 -*-
"""WGS84 グリッド集約（GPKG 点をゾーン別ストリーム読込）。"""
from __future__ import annotations

import math
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator

from osgeo import ogr, osr

LAYER_NAME = "kijyunten"
WHERE_FILTER = (
    "legend_display IS NOT NULL AND TRIM(COALESCE(legend_display,'')) <> '' "
    "AND (data_system IS NULL OR data_system <> 'totiriyo')"
)


@dataclass
class GridLevel:
    level: int
    cell_deg: float
    minzoom: int
    maxzoom: int
    layer_name: str = ""

    def __post_init__(self) -> None:
        if not self.layer_name:
            self.layer_name = f"overview_L{self.level}"


@dataclass
class CellStats:
    cells: int = 0
    total_points: int = 0
    max_n: int = 0
    n_values: list[int] = field(default_factory=list)

    def add_bucket(self, n: int) -> None:
        self.cells += 1
        self.total_points += n
        self.max_n = max(self.max_n, n)
        self.n_values.append(n)

    def p95_n(self) -> float:
        if not self.n_values:
            return 0.0
        s = sorted(self.n_values)
        i = min(len(s) - 1, int(len(s) * 0.95))
        return float(s[i])

    def mean_n(self) -> float:
        if not self.cells:
            return 0.0
        return self.total_points / self.cells


class MultiGridAggregator:
    """複数 cell_deg を1パスで集約。"""

    def __init__(self, cell_degs: list[float]) -> None:
        self.cell_degs = cell_degs
        self._counts: dict[float, dict[tuple[int, int], int]] = {
            d: defaultdict(int) for d in cell_degs
        }

    def add_point(self, lon: float, lat: float) -> None:
        for deg in self.cell_degs:
            gx = math.floor(lon / deg)
            gy = math.floor(lat / deg)
            self._counts[deg][(gx, gy)] += 1

    def stats(self, deg: float) -> CellStats:
        st = CellStats()
        for n in self._counts[deg].values():
            st.add_bucket(n)
        return st

    def total_cells_all_degs(self) -> int:
        return sum(len(b) for b in self._counts.values())


class LevelGridAggregator:
    """確定した3段グリッド用。"""

    def __init__(self, levels: list[GridLevel]) -> None:
        self.levels = levels
        self._counts: dict[int, dict[tuple[int, int], int]] = {
            lv.level: defaultdict(int) for lv in levels
        }
        self._deg_by_level = {lv.level: lv.cell_deg for lv in levels}

    def add_point(self, lon: float, lat: float) -> None:
        for lv in self.levels:
            deg = lv.cell_deg
            gx = math.floor(lon / deg)
            gy = math.floor(lat / deg)
            self._counts[lv.level][(gx, gy)] += 1

    def iter_features(self) -> Iterator[tuple[GridLevel, int, int, int]]:
        for lv in self.levels:
            for (gx, gy), n in self._counts[lv.level].items():
                yield lv, gx, gy, n

    def feature_count(self) -> int:
        return sum(len(b) for b in self._counts.values())

    def stats_per_level(self) -> dict[int, CellStats]:
        out: dict[int, CellStats] = {}
        for lv in self.levels:
            st = CellStats()
            for n in self._counts[lv.level].values():
                st.add_bucket(n)
            out[lv.level] = st
        return out


def _cell_bbox_polygon(gx: int, gy: int, cell_deg: float) -> ogr.Geometry:
    """占有セルの WGS84 外接矩形（反時計回り）。"""
    min_lon = gx * cell_deg
    min_lat = gy * cell_deg
    max_lon = (gx + 1) * cell_deg
    max_lat = (gy + 1) * cell_deg
    ring = ogr.Geometry(ogr.wkbLinearRing)
    ring.AddPoint(min_lon, min_lat)
    ring.AddPoint(max_lon, min_lat)
    ring.AddPoint(max_lon, max_lat)
    ring.AddPoint(min_lon, max_lat)
    ring.AddPoint(min_lon, min_lat)
    poly = ogr.Geometry(ogr.wkbPolygon)
    poly.AddGeometry(ring)
    poly.FlattenTo2D()
    return poly


def ingest_gpkg_points(gpkg_path: Path, sink: MultiGridAggregator | LevelGridAggregator) -> int:
    ds = ogr.Open(str(gpkg_path), 0)
    if ds is None:
        raise RuntimeError(f"GPKG を開けません: {gpkg_path}")
    layer = ds.GetLayer(LAYER_NAME)
    if layer is None:
        raise RuntimeError(f"レイヤ {LAYER_NAME} がありません: {gpkg_path}")
    layer.SetAttributeFilter(WHERE_FILTER)

    srs_wgs = osr.SpatialReference()
    srs_wgs.ImportFromEPSG(4326)
    srs_wgs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    layer_srs = layer.GetSpatialRef()
    if layer_srs is None:
        raise RuntimeError(f"CRS がありません: {gpkg_path}")
    layer_srs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    ct = osr.CoordinateTransformation(layer_srs, srs_wgs)

    n_pts = 0
    for feat in layer:
        geom = feat.GetGeometryRef()
        if geom is None or geom.IsEmpty():
            continue
        geom_clone = geom.Clone()
        geom_clone.Transform(ct)
        sink.add_point(geom_clone.GetX(), geom_clone.GetY())
        n_pts += 1
    ds = None
    return n_pts


def ingest_all_gpkgs(
    gpkg_dir: Path,
    gpkg_names: list[str],
    sink: MultiGridAggregator | LevelGridAggregator,
) -> dict[str, int]:
    per_file: dict[str, int] = {}
    for name in gpkg_names:
        path = gpkg_dir / name
        if not path.is_file():
            raise FileNotFoundError(f"GPKG がありません: {path}")
        per_file[name] = ingest_gpkg_points(path, sink)
    return per_file


def write_overview_gpkg(
    out_path: Path,
    levels: list[GridLevel],
    aggregator: LevelGridAggregator,
) -> None:
    if out_path.exists():
        out_path.unlink()

    drv = ogr.GetDriverByName("GPKG")
    ds = drv.CreateDataSource(str(out_path))
    if ds is None:
        raise RuntimeError(f"GPKG 作成失敗: {out_path}")

    srs = osr.SpatialReference()
    srs.ImportFromEPSG(4326)
    srs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)

    layers_created: dict[str, ogr.Layer] = {}
    for lv in levels:
        lyr = ds.CreateLayer(lv.layer_name, srs, ogr.wkbPolygon)
        if lyr is None:
            raise RuntimeError(f"レイヤ作成失敗: {lv.layer_name}")
        lyr.CreateField(ogr.FieldDefn("n", ogr.OFTInteger))
        fld_lv = ogr.FieldDefn("level", ogr.OFTInteger)
        lyr.CreateField(fld_lv)
        fld_mz = ogr.FieldDefn("minzoom", ogr.OFTInteger)
        lyr.CreateField(fld_mz)
        fld_xz = ogr.FieldDefn("maxzoom", ogr.OFTInteger)
        lyr.CreateField(fld_xz)
        layers_created[lv.level] = lyr

    for lv, gx, gy, n in aggregator.iter_features():
        lyr = layers_created[lv.level]
        feat = ogr.Feature(lyr.GetLayerDefn())
        feat.SetField("n", n)
        feat.SetField("level", lv.level)
        feat.SetField("minzoom", lv.minzoom)
        feat.SetField("maxzoom", lv.maxzoom)
        feat.SetGeometry(_cell_bbox_polygon(gx, gy, lv.cell_deg))
        lyr.CreateFeature(feat)
        feat = None

    ds = None
