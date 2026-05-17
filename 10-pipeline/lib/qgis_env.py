# -*- coding: utf-8 -*-
"""QGIS 3.44 同梱 python / ogr2ogr の解決と実行。"""
from __future__ import annotations

import os
import re
import subprocess
from pathlib import Path

REQUIRED_QGIS_PREFIX = "3.44"
PYTHON_LAUNCHERS = ("python-qgis.bat", "python-qgis-ltr.bat")


def _is_valid_qgis_bin(path: Path) -> bool:
    if not (path / "ogr2ogr.exe").is_file():
        return False
    return any((path / name).is_file() for name in PYTHON_LAUNCHERS)


def python_qgis_bat(qgis_bin: Path) -> Path:
    for name in PYTHON_LAUNCHERS:
        bat = qgis_bin / name
        if bat.is_file():
            return bat
    raise FileNotFoundError(
        f"python-qgis.bat / python-qgis-ltr.bat がありません: {qgis_bin}"
    )


def discover_qgis_344_bins() -> list[Path]:
    """Program Files 内の QGIS 3.44.* を探索（新しい版を優先）。"""
    found: list[tuple[tuple[int, ...], Path]] = []
    for base in (Path(r"C:\Program Files"), Path(r"C:\Program Files (x86)")):
        if not base.is_dir():
            continue
        for child in base.iterdir():
            if not child.is_dir():
                continue
            m = re.match(r"QGIS\s+3\.44\.(\d+)", child.name, re.IGNORECASE)
            if not m:
                continue
            bin_dir = child / "bin"
            if _is_valid_qgis_bin(bin_dir):
                found.append(((3, 44, int(m.group(1))), bin_dir.resolve()))
    found.sort(key=lambda x: x[0], reverse=True)
    return [p for _, p in found]


def resolve_qgis_bin(preferred: str | None = None) -> Path:
    if preferred:
        p = Path(preferred)
        if _is_valid_qgis_bin(p):
            return p.resolve()
        raise FileNotFoundError(f"QGIS bin が不正です: {preferred}")

    env = os.environ.get("QGIS_BIN")
    if env:
        return resolve_qgis_bin(env)

    discovered = discover_qgis_344_bins()
    if discovered:
        return discovered[0]

    raise FileNotFoundError(
        "QGIS 3.44 の bin が見つかりません。\n"
        "  例: C:\\Program Files\\QGIS 3.44.9\\bin\n"
        "  -QgisBin または環境変数 QGIS_BIN を設定してください。"
    )


def qgis_version(qgis_bin: Path) -> str:
    bat = python_qgis_bat(qgis_bin)
    cmd = f'"{bat}" -c "from qgis.core import Qgis; print(Qgis.QGIS_VERSION)"'
    proc = subprocess.run(
        cmd,
        shell=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if proc.returncode != 0:
        raise RuntimeError(f"QGIS バージョン取得失敗:\n{proc.stderr}")
    return proc.stdout.strip()


def assert_qgis_344(qgis_bin: Path) -> str:
    ver = qgis_version(qgis_bin)
    if not ver.startswith(REQUIRED_QGIS_PREFIX):
        raise RuntimeError(
            f"QGIS {REQUIRED_QGIS_PREFIX} 系が必要ですが検出: {ver} ({qgis_bin})\n"
            "OSGeo4W の 3.40 等ではなく、スタンドアロン QGIS 3.44 の bin を指定してください。"
        )
    return ver


def ogr2ogr_path(qgis_bin: Path) -> Path:
    exe = qgis_bin / "ogr2ogr.exe"
    if not exe.is_file():
        raise FileNotFoundError(f"ogr2ogr.exe がありません: {exe}")
    return exe


def _apply_gdal_env(env: dict[str, str], qgis_bin: Path) -> None:
    bin_str = str(qgis_bin)
    env["PATH"] = bin_str + os.pathsep + env.get("PATH", "")
    env["OGR2OGR_USE_ARROW_API"] = "NO"
    app_root = qgis_bin.parent
    for proj in (
        app_root / "share" / "proj",
        app_root / "apps" / "proj" / "share" / "proj",
        Path(r"C:\OSGeo4W\share\proj"),
    ):
        if (proj / "proj.db").is_file():
            env["PROJ_LIB"] = str(proj)
            break
    for gdal_data in (
        app_root / "share" / "gdal",
        app_root / "apps" / "gdal" / "share" / "gdal",
        Path(r"C:\OSGeo4W\share\gdal"),
    ):
        if (gdal_data / "gdalvrt.xsd").is_file() or (gdal_data / "pcs.csv").is_file():
            env["GDAL_DATA"] = str(gdal_data)
            break


def run_ogr2ogr(
    qgis_bin: Path,
    args: list[str],
    *,
    log_path: Path | None = None,
) -> None:
    exe = ogr2ogr_path(qgis_bin)
    env = os.environ.copy()
    _apply_gdal_env(env, qgis_bin)

    cmd = [str(exe), *args]
    line = " ".join(f'"{c}"' if " " in c else c for c in cmd)
    if log_path:
        with log_path.open("a", encoding="utf-8") as f:
            f.write(line + "\n")

    proc = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env,
    )
    if proc.returncode != 0:
        msg = f"ogr2ogr 失敗 (exit {proc.returncode})\n{line}\n{proc.stderr}\n{proc.stdout}"
        if log_path:
            with log_path.open("a", encoding="utf-8") as f:
                f.write(msg + "\n")
        raise RuntimeError(msg)


def verify_environment(qgis_bin: Path, log_path: Path | None = None) -> dict[str, str]:
    ver = assert_qgis_344(qgis_bin)
    exe = ogr2ogr_path(qgis_bin)
    env = os.environ.copy()
    _apply_gdal_env(env, qgis_bin)
    proc = subprocess.run(
        [str(exe), "--version"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env,
    )
    gdal_ver = (proc.stdout or proc.stderr).strip()
    proc2 = subprocess.run(
        [str(exe), "--formats"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env,
    )
    if "PMTiles" not in (proc2.stdout or ""):
        raise RuntimeError("ogr2ogr に PMTiles ドライバがありません")
    info = {
        "qgis_version": ver,
        "gdal_version": gdal_ver,
        "qgis_bin": str(qgis_bin),
        "python_launcher": str(python_qgis_bat(qgis_bin)),
    }
    if log_path:
        with log_path.open("a", encoding="utf-8") as f:
            for k, v in info.items():
                f.write(f"{k}={v}\n")
    return info
