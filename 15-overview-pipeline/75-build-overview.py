# -*- coding: utf-8 -*-
"""
3段グリッド overview PMTiles 生成。

実行: python-qgis-ltr.bat 75-build-overview.py
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
_DETAIL_PIPELINE = _SCRIPT_DIR.parent / "10-pipeline"
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))
if str(_DETAIL_PIPELINE) not in sys.path:
    sys.path.insert(1, str(_DETAIL_PIPELINE))

from lib.grid_aggregate import (  # noqa: E402
    GridLevel,
    LevelGridAggregator,
    ingest_all_gpkgs,
    write_overview_gpkg,
)
from lib.overview_paths import (  # noqa: E402
    default_input_gpkg_dir,
    default_output_dir,
    input_gpkg_files,
    load_overview_schema,
)
from lib.qgis_env import resolve_qgis_bin, run_ogr2ogr, verify_environment  # noqa: E402


def _grid_levels_from_schema(schema: dict) -> list[GridLevel]:
    return [
        GridLevel(
            level=int(g["level"]),
            cell_deg=float(g["cell_deg"]),
            minzoom=int(g["minzoom"]),
            maxzoom=int(g["maxzoom"]),
            layer_name=str(g.get("layer_name", f"overview_L{g['level']}")),
        )
        for g in schema["grid_levels"]
    ]


def _update_manifest(
    output_dir: Path,
    out_pmtiles: Path,
    levels: list[GridLevel],
    stats: dict[int, object],
    feature_count: int,
    qgis_bin: Path,
    schema: dict,
) -> None:
    manifest_path = output_dir / "manifest.json"
    if manifest_path.is_file():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    else:
        manifest = {}

    zoom = schema.get("overview_zoom", {"minzoom": 0, "maxzoom": 14})
    manifest["overview"] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "pmtiles": out_pmtiles.name,
        "path": str(out_pmtiles.relative_to(output_dir)).replace("\\", "/"),
        "bytes": out_pmtiles.stat().st_size if out_pmtiles.is_file() else 0,
        "minzoom": int(zoom["minzoom"]),
        "maxzoom": int(zoom["maxzoom"]),
        "feature_count": feature_count,
        "grid_levels": [
            {
                "level": lv.level,
                "cell_deg": lv.cell_deg,
                "minzoom": lv.minzoom,
                "maxzoom": lv.maxzoom,
                "layer_name": lv.layer_name,
                "cells": stats[lv.level].cells,
            }
            for lv in levels
        ],
        "qgis_bin": str(qgis_bin),
    }
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="overview PMTiles 生成")
    parser.add_argument("-i", "--input-dir", type=Path, default=None)
    parser.add_argument("-o", "--output-dir", type=Path, default=None)
    parser.add_argument("--qgis-bin", type=str, default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    schema = load_overview_schema()
    gpkg_dir = (args.input_dir or default_input_gpkg_dir()).resolve()
    output_dir = (args.output_dir or default_output_dir()).resolve()
    gpkg_names = input_gpkg_files()
    levels = _grid_levels_from_schema(schema)

    tmp_gpkg = output_dir / schema["tmp_gpkg"]
    out_pmtiles = (output_dir / schema["output_pmtiles"]).resolve()

    qgis_bin = resolve_qgis_bin(args.qgis_bin)
    log_path = output_dir / "build_overview.log"

    if not args.dry_run:
        output_dir.mkdir(parents=True, exist_ok=True)
        with log_path.open("w", encoding="utf-8") as f:
            f.write(f"started={datetime.now(timezone.utc).isoformat()}\n")
        env_info = verify_environment(qgis_bin, log_path)
        print(f"QGIS {env_info['qgis_version']} / {env_info['gdal_version']}")

    agg = LevelGridAggregator(levels)
    print(f"GPKG 集約: {gpkg_dir}")
    per_gpkg = ingest_all_gpkgs(gpkg_dir, gpkg_names, agg)
    print(f"  入力点数: {sum(per_gpkg.values()):,}")
    level_stats = agg.stats_per_level()
    for lv in levels:
        st = level_stats[lv.level]
        print(f"  {lv.layer_name}: cells={st.cells:,} cell_deg={lv.cell_deg}")

    if args.dry_run:
        print(f"[dry-run] 出力予定: {out_pmtiles}")
        return 0

    tmp_gpkg.parent.mkdir(parents=True, exist_ok=True)
    write_overview_gpkg(tmp_gpkg, levels, agg)
    print(f"中間 GPKG: {tmp_gpkg}")

    out_pmtiles.parent.mkdir(parents=True, exist_ok=True)
    if out_pmtiles.exists():
        out_pmtiles.unlink()

    zoom = schema["overview_zoom"]
    layer_args: list[str] = []
    for lv in levels:
        layer_args.extend([lv.layer_name])

    ogr_args = [
        "-overwrite",
        "-f",
        "PMTiles",
        "-t_srs",
        "EPSG:4326",
        "-dsco",
        f"MINZOOM={zoom['minzoom']}",
        "-dsco",
        f"MAXZOOM={zoom['maxzoom']}",
        str(out_pmtiles),
        str(tmp_gpkg),
        *layer_args,
    ]
    run_ogr2ogr(qgis_bin, ogr_args, log_path=log_path)

    sz = out_pmtiles.stat().st_size
    print(f"OK {out_pmtiles.name} ({sz // 1024 // 1024} MB)")

    _update_manifest(
        output_dir, out_pmtiles, levels, level_stats, agg.feature_count(), qgis_bin, schema
    )
    print(f"manifest 更新: {output_dir / 'manifest.json'}")

    max_b = int(schema.get("max_pmtiles_bytes", 10485760))
    if sz > max_b:
        print(
            f"警告: 目標 {max_b // 1024 // 1024} MB を超過しています ({sz // 1024 // 1024} MB)",
            file=sys.stderr,
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
