# -*- coding: utf-8 -*-
"""
測地成果2011 GPKG → detail PMTiles（QGIS 3.44 同梱 ogr2ogr 必須）

実行:
  python-qgis.bat 70-gpkg2pmtiles.py
  python-qgis.bat 70-gpkg2pmtiles.py --zones 11
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from lib.paths import (  # noqa: E402
    default_input_dir,
    default_output_dir,
    detail_pmtiles_dir,
    load_schema,
    parse_zone_from_filename,
    pmtiles_basename,
    pipeline_dir,
)
from lib.qgis_env import (  # noqa: E402
    ogr2ogr_path,
    qgis_version,
    resolve_qgis_bin,
    run_ogr2ogr,
    verify_environment,
    _apply_gdal_env,
)
from lib.size_split import file_size, needs_split  # noqa: E402
from lib.slim_sql import LAYER, build_select_sql  # noqa: E402


def _filter_input_files(schema: dict, zones: set[int] | None) -> list[str]:
    files = list(schema["input_files"])
    if not zones:
        return files
    out: list[str] = []
    for name in files:
        z = parse_zone_from_filename(name)
        if z is not None and z in zones:
            out.append(name)
    return out


def _sql_work_dir(_output_dir: Path) -> Path:
    """ogr2ogr -sql @file 用（日本語パス回避のため固定 ASCII パス）。"""
    work = Path("C:/temp/gaiku_pmtiles")
    work.mkdir(parents=True, exist_ok=True)
    return work


def _write_sql_file(sql: str, work_dir: Path, tag: str) -> Path:
    work_dir.mkdir(parents=True, exist_ok=True)
    safe = "".join(c if c.isalnum() or c in "_-" else "_" for c in tag)
    path = work_dir / f"select_{safe}.sql"
    path.write_text(sql, encoding="utf-8")
    return path


def convert_one(
    *,
    gpkg_path: Path,
    out_path: Path,
    qgis_bin: Path,
    schema: dict,
    sokuti: str,
    zone: int,
    prefix_filter: str | None,
    log_path: Path,
    sql_work_dir: Path,
    dry_run: bool,
) -> None:
    tag = out_path.stem.replace(".", "_")
    if prefix_filter:
        tag += f"_{prefix_filter}"
    sql = build_select_sql(sokuti=sokuti, zone=zone, prefix_filter=prefix_filter)
    sql_file = _write_sql_file(sql, sql_work_dir, tag)

    zoom = schema["detail_zoom"]
    args = [
        "-overwrite",
        "-f",
        "PMTiles",
        "-t_srs",
        "EPSG:4326",
        "-dialect",
        "SQLite",
        "-sql",
        f"@{sql_file.as_posix()}",
        "-dsco",
        f"MINZOOM={zoom['minzoom']}",
        "-dsco",
        f"MAXZOOM={zoom['maxzoom']}",
        "-nln",
        LAYER,
        str(out_path),
        str(gpkg_path),
    ]

    if dry_run:
        print(f"[dry-run] {' '.join(str(a) for a in args)}")
        return

    out_path.parent.mkdir(parents=True, exist_ok=True)
    if out_path.exists():
        out_path.unlink()
    run_ogr2ogr(qgis_bin, args, log_path=log_path)


def process_gpkg(
    *,
    gpkg_name: str,
    input_dir: Path,
    output_dir: Path,
    qgis_bin: Path,
    schema: dict,
    log_path: Path,
    sql_work_dir: Path,
    dry_run: bool,
) -> list[dict]:
    gpkg_path = input_dir / gpkg_name
    if not gpkg_path.is_file():
        raise FileNotFoundError(f"入力 GPKG がありません: {gpkg_path}")

    zone = parse_zone_from_filename(gpkg_name)
    if zone is None:
        raise ValueError(f"zone を解析できません: {gpkg_name}")

    sokuti = schema.get("sokuti", "2011")
    detail_dir = detail_pmtiles_dir(output_dir)
    out_main = detail_dir / pmtiles_basename(gpkg_name)
    records: list[dict] = []

    print(f"変換: {gpkg_name} -> {out_main.name}")
    convert_one(
        gpkg_path=gpkg_path,
        out_path=out_main,
        qgis_bin=qgis_bin,
        schema=schema,
        sokuti=sokuti,
        zone=zone,
        prefix_filter=None,
        log_path=log_path,
        sql_work_dir=sql_work_dir,
        dry_run=dry_run,
    )

    if dry_run:
        records.append({"gpkg": gpkg_name, "pmtiles": out_main.name, "split": False})
        return records

    threshold = int(schema.get("split_threshold_bytes", 94371840))
    prefixes: list[str | None] = [None]

    if needs_split(out_main, threshold):
        print(f"  分割: {out_main.name} ({file_size(out_main) // 1024 // 1024} MB)")
        out_main.unlink()
        prefixes = list(schema.get("split_prefixes", ["H", "S", "T", "TKS", "TKT"]))

    for prefix in prefixes:
        if prefix is None:
            out_path = out_main
            split = False
        else:
            out_path = detail_dir / pmtiles_basename(gpkg_name, prefix)
            split = True
            if out_path.exists():
                out_path.unlink()

        convert_one(
            gpkg_path=gpkg_path,
            out_path=out_path,
            qgis_bin=qgis_bin,
            schema=schema,
            sokuti=sokuti,
            zone=zone,
            prefix_filter=prefix,
            log_path=log_path,
            sql_work_dir=sql_work_dir,
            dry_run=dry_run,
        )

        if not dry_run and out_path.is_file():
            sz = file_size(out_path)
            records.append(
                {
                    "gpkg": gpkg_name,
                    "pmtiles": out_path.name,
                    "path": str(out_path.relative_to(output_dir)).replace("\\", "/"),
                    "bytes": sz,
                    "zone": zone,
                    "sokuti": sokuti,
                    "epsg": 6668 + zone,
                    "csv_prefix": prefix,
                    "split": split,
                }
            )
            print(f"  OK {out_path.name} ({sz // 1024 // 1024} MB)")

    return records


def main() -> int:
    parser = argparse.ArgumentParser(description="GPKG → detail PMTiles")
    parser.add_argument("-i", "--input-dir", type=Path, default=None)
    parser.add_argument("-o", "--output-dir", type=Path, default=None)
    parser.add_argument("--zones", type=str, default=None, help="例: 11 または 9,10")
    parser.add_argument("--qgis-bin", type=str, default=None)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--dev-allow-non-344",
        action="store_true",
        help="開発用: QGIS 3.44 以外の bin でも ogr2ogr を実行（本番非推奨）",
    )
    args = parser.parse_args()

    schema = load_schema()
    input_dir = (args.input_dir or default_input_dir()).resolve()
    output_dir = (args.output_dir or default_output_dir()).resolve()
    zones: set[int] | None = None
    if args.zones:
        zones = set()
        for part in args.zones.split(","):
            part = part.strip()
            if part:
                zones.add(int(part))

    qgis_bin = resolve_qgis_bin(args.qgis_bin)
    log_path = output_dir / "build.log"
    sql_work_dir = _sql_work_dir(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not args.dry_run:
        with log_path.open("w", encoding="utf-8") as f:
            f.write(f"started={datetime.now(timezone.utc).isoformat()}\n")
        if args.dev_allow_non_344:
            import os
            import subprocess

            ver = qgis_version(qgis_bin)
            if not ver.startswith("3.44"):
                msg = (
                    f"WARNING: QGIS {ver} (--dev-allow-non-344). "
                    "本番は 3.44 を使用してください。\n"
                )
                print(msg, file=sys.stderr)
                with log_path.open("a", encoding="utf-8") as f:
                    f.write(msg)
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
            env_info = {
                "qgis_version": ver,
                "gdal_version": gdal_ver,
                "qgis_bin": str(qgis_bin),
            }
            with log_path.open("a", encoding="utf-8") as f:
                for k, v in env_info.items():
                    f.write(f"{k}={v}\n")
        else:
            env_info = verify_environment(qgis_bin, log_path)
        print(f"QGIS {env_info['qgis_version']} / {env_info['gdal_version']}")

    files = _filter_input_files(schema, zones)
    if not files:
        print("対象ファイルがありません", file=sys.stderr)
        return 1

    all_records: list[dict] = []
    errors: list[str] = []

    for name in files:
        try:
            recs = process_gpkg(
                gpkg_name=name,
                input_dir=input_dir,
                output_dir=output_dir,
                qgis_bin=qgis_bin,
                schema=schema,
                log_path=log_path,
                sql_work_dir=sql_work_dir,
                dry_run=args.dry_run,
            )
            all_records.extend(recs)
        except Exception as e:
            errors.append(f"{name}: {e}")
            print(f"ERROR {name}: {e}", file=sys.stderr)

    if not args.dry_run:
        manifest = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "dev_allow_non_344": args.dev_allow_non_344,
            "qgis_bin": str(qgis_bin),
            "input_dir": str(input_dir),
            "output_dir": str(output_dir),
            "layers": all_records,
            "errors": errors,
        }
        manifest_path = output_dir / "manifest.json"
        manifest_path.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"manifest: {manifest_path}")

    if errors:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
