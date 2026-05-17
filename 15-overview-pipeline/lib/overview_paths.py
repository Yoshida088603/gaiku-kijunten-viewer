# -*- coding: utf-8 -*-
from __future__ import annotations

import json
from pathlib import Path

_OVERVIEW_DIR = Path(__file__).resolve().parents[1]
_VIEWER_ROOT = _OVERVIEW_DIR.parent
_DETAIL_PIPELINE = _VIEWER_ROOT / "10-pipeline"


def overview_dir() -> Path:
    return _OVERVIEW_DIR


def load_overview_schema() -> dict:
    with (_OVERVIEW_DIR / "overview_schema.json").open(encoding="utf-8") as f:
        return json.load(f)


def load_detail_schema() -> dict:
    with (_DETAIL_PIPELINE / "pmtiles_schema.json").open(encoding="utf-8") as f:
        return json.load(f)


def dvd_repo_root() -> Path:
    return _VIEWER_ROOT.parents[2]


def default_output_dir() -> Path:
    return (_VIEWER_ROOT / "20-data").resolve()


def default_input_gpkg_dir() -> Path:
    return (dvd_repo_root() / "20_output" / "60-csv2geopackage").resolve()


def detail_pmtiles_dir() -> Path:
    return default_output_dir() / "pmtiles" / "detail"


def overview_pmtiles_dir() -> Path:
    return default_output_dir() / "pmtiles" / "overview"


def input_gpkg_files() -> list[str]:
    return list(load_detail_schema()["input_files"])
