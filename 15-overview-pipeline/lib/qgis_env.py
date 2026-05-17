# -*- coding: utf-8 -*-
"""10-pipeline/lib/qgis_env.py の再エクスポート（同名 lib パッケージ衝突回避）。"""
from __future__ import annotations

import importlib.util
from pathlib import Path

_DETAIL_QGIS_ENV = (
    Path(__file__).resolve().parents[2] / "10-pipeline" / "lib" / "qgis_env.py"
)


def _load_detail_qgis_env():
    spec = importlib.util.spec_from_file_location(
        "gaiku_detail_qgis_env", _DETAIL_QGIS_ENV
    )
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load {_DETAIL_QGIS_ENV}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_m = _load_detail_qgis_env()

discover_qgis_344_bins = _m.discover_qgis_344_bins
resolve_qgis_bin = _m.resolve_qgis_bin
python_qgis_bat = _m.python_qgis_bat
qgis_version = _m.qgis_version
assert_qgis_344 = _m.assert_qgis_344
ogr2ogr_path = _m.ogr2ogr_path
run_ogr2ogr = _m.run_ogr2ogr
verify_environment = _m.verify_environment
_apply_gdal_env = _m._apply_gdal_env

__all__ = [
    "discover_qgis_344_bins",
    "resolve_qgis_bin",
    "python_qgis_bat",
    "qgis_version",
    "assert_qgis_344",
    "ogr2ogr_path",
    "run_ogr2ogr",
    "verify_environment",
    "_apply_gdal_env",
]
