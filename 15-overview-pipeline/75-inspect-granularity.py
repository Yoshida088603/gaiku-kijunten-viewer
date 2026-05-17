# -*- coding: utf-8 -*-
"""
GPKG / detail PMTiles を検査し、overview グリッド粒度の推奨を JSON 出力。

実行: python-qgis-ltr.bat 75-inspect-granularity.py
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
_DETAIL_PIPELINE = _SCRIPT_DIR.parent / "10-pipeline"
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))
if str(_DETAIL_PIPELINE) not in sys.path:
    sys.path.insert(1, str(_DETAIL_PIPELINE))

from lib.grid_aggregate import MultiGridAggregator, ingest_all_gpkgs  # noqa: E402
from lib.overview_paths import (  # noqa: E402
    default_input_gpkg_dir,
    default_output_dir,
    detail_pmtiles_dir,
    input_gpkg_files,
    load_overview_schema,
)


def _inspect_detail_pmtiles(detail_dir: Path) -> list[dict]:
    rows: list[dict] = []
    if not detail_dir.is_dir():
        return rows
    for p in sorted(detail_dir.glob("*.pmtiles")):
        meta = {
            "file": p.name,
            "bytes": p.stat().st_size,
            "feature_count": None,
            "minzoom": None,
            "maxzoom": None,
            "bounds": None,
        }
        try:
            from osgeo import gdal

            ds = gdal.OpenEx(str(p), gdal.OF_VECTOR | gdal.OF_READONLY)
            if ds is None:
                rows.append(meta)
                continue
            lyr = ds.GetLayer(0)
            if lyr is not None:
                meta["feature_count"] = lyr.GetFeatureCount()
            # gdal metadata
            m = ds.GetMetadata() or {}
            meta["minzoom"] = m.get("minzoom")
            meta["maxzoom"] = m.get("maxzoom")
            meta["bounds"] = m.get("bounds")
            ds = None
        except Exception as e:
            meta["error"] = str(e)
        rows.append(meta)
    return rows


def _ogrinfo_fallback(detail_dir: Path) -> list[dict]:
    """gdal.OpenEx で取れない場合の簡易集計。"""
    import subprocess

    from lib.qgis_env import discover_qgis_344_bins, ogr2ogr_path, _apply_gdal_env
    import os

    qgis_bin = discover_qgis_344_bins()[0]
    ogrinfo = qgis_bin / "ogrinfo.exe"
    rows = []
    env = os.environ.copy()
    _apply_gdal_env(env, qgis_bin)
    for p in sorted(detail_dir.glob("*.pmtiles")):
        meta = {"file": p.name, "bytes": p.stat().st_size}
        proc = subprocess.run(
            [str(ogrinfo), "-al", "-so", str(p)],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            env=env,
        )
        text = proc.stdout or ""
        m = re.search(r"Feature Count: (\d+)", text)
        if m:
            meta["feature_count"] = int(m.group(1))
        m = re.search(r"minzoom=(\d+)", text)
        if m:
            meta["minzoom"] = int(m.group(1))
        m = re.search(r"maxzoom=(\d+)", text)
        if m:
            meta["maxzoom"] = int(m.group(1))
        m = re.search(r"bounds=([0-9.,\-]+)", text)
        if m:
            meta["bounds"] = m.group(1)
        rows.append(meta)
    return rows


def _recommend_triple(
    schema: dict,
    per_deg: dict[str, dict],
) -> dict:
    """3段合計セル数が target 範囲に近い組み合わせを推奨。"""
    candidates = schema["candidate_cell_deg"]
    l1_opts = [d for d in candidates if d >= 0.25]
    l2_opts = [d for d in candidates if 0.08 <= d <= 0.2]
    l3_opts = [d for d in candidates if d <= 0.06]

    best = None
    tmin = schema.get("target_total_cells_min", 12000)
    tmax = schema.get("target_total_cells_max", 28000)

    for d1 in l1_opts:
        for d2 in l2_opts:
            if d2 >= d1:
                continue
            for d3 in l3_opts:
                if d3 >= d2:
                    continue
                total = (
                    per_deg[str(d1)]["cells"]
                    + per_deg[str(d2)]["cells"]
                    + per_deg[str(d3)]["cells"]
                )
                score = 0
                if tmin <= total <= tmax:
                    score = 1000 - abs(total - (tmin + tmax) // 2)
                else:
                    score = -abs(total - tmax) if total > tmax else -abs(tmin - total)
                cand = {
                    "L1_cell_deg": d1,
                    "L2_cell_deg": d2,
                    "L3_cell_deg": d3,
                    "total_cells": total,
                    "score": score,
                }
                if best is None or cand["score"] > best["score"]:
                    best = cand

    configured = schema["grid_levels"]
    return {
        "recommended_triple": best,
        "configured_in_schema": configured,
        "note": "build は overview_schema.json の grid_levels を使用。検査結果と乖離する場合は schema を更新してください。",
    }


def main() -> int:
    schema = load_overview_schema()
    gpkg_dir = default_input_gpkg_dir()
    gpkg_names = input_gpkg_files()
    out_dir = default_output_dir()
    out_dir.mkdir(parents=True, exist_ok=True)
    report_path = out_dir / "overview_granularity_report.json"

    candidate_degs = schema["candidate_cell_deg"]
    agg = MultiGridAggregator(candidate_degs)

    print(f"GPKG 読込: {gpkg_dir}")
    per_gpkg = ingest_all_gpkgs(gpkg_dir, gpkg_names, agg)
    total_pts = sum(per_gpkg.values())
    print(f"  点数合計: {total_pts:,}")

    per_deg: dict[str, dict] = {}
    for deg in candidate_degs:
        st = agg.stats(deg)
        per_deg[str(deg)] = {
            "cells": st.cells,
            "total_points": st.total_points,
            "max_n": st.max_n,
            "p95_n": round(st.p95_n(), 1),
            "mean_n": round(st.mean_n(), 1),
        }
        print(
            f"  cell_deg={deg}: cells={st.cells:,} max_n={st.max_n} "
            f"p95_n={st.p95_n():.0f}"
        )

    detail_dir = detail_pmtiles_dir()
    detail_rows = _inspect_detail_pmtiles(detail_dir)
    if detail_rows and detail_rows[0].get("feature_count") is None:
        detail_rows = _ogrinfo_fallback(detail_dir)

    detail_total = sum(r.get("feature_count") or 0 for r in detail_rows)

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "input_gpkg_dir": str(gpkg_dir),
        "detail_pmtiles_dir": str(detail_dir),
        "total_source_points": total_pts,
        "detail_pmtiles_feature_total": detail_total,
        "per_gpkg_point_counts": per_gpkg,
        "per_candidate_cell_deg": per_deg,
        "detail_pmtiles": detail_rows,
        "recommendation": _recommend_triple(schema, per_deg),
    }

    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"レポート: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
