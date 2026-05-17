# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import re
from pathlib import Path

_PIPELINE_DIR = Path(__file__).resolve().parents[1]
_VIEWER_ROOT = _PIPELINE_DIR.parent


def load_schema() -> dict:
    with (_PIPELINE_DIR / "pmtiles_schema.json").open(encoding="utf-8") as f:
        return json.load(f)


def viewer_root() -> Path:
    return _VIEWER_ROOT


def pipeline_dir() -> Path:
    return _PIPELINE_DIR


def dvd_repo_root() -> Path:
    """05ホームページ公開用データ及びプログラム ルート（viewer の3階層上）。"""
    return _VIEWER_ROOT.parents[2]


def default_input_dir() -> Path:
    schema = load_schema()
    rel = schema.get("input_dir_relative", "20_output/60-csv2geopackage")
    if rel.startswith(".."):
        return (_PIPELINE_DIR / rel).resolve()
    return (dvd_repo_root() / rel).resolve()


def default_output_dir() -> Path:
    schema = load_schema()
    rel = schema.get("output_dir_relative", "../20-data")
    return (_PIPELINE_DIR / rel).resolve()


def detail_pmtiles_dir(output_dir: Path | None = None) -> Path:
    out = output_dir or default_output_dir()
    return out / "pmtiles" / "detail"


def parse_zone_from_filename(name: str) -> int | None:
    m = re.search(r"zone(\d{2})", name, re.IGNORECASE)
    if not m:
        return None
    return int(m.group(1), 10)


def pmtiles_basename(gpkg_name: str, suffix: str = "") -> str:
    stem = Path(gpkg_name).stem
    if suffix:
        return f"{stem}_{suffix}.pmtiles"
    return f"{stem}.pmtiles"
