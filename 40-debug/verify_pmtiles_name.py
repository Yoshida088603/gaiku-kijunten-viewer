# -*- coding: utf-8 -*-
"""再生成 PMTiles の name を GPKG と照合。"""
from __future__ import annotations

import json
import sqlite3
import subprocess
import sys
from pathlib import Path

_SCRIPT = Path(__file__).resolve()
VIEWER = _SCRIPT.parents[1]
REPO = VIEWER.parents[2]
GPKG_DIR = REPO / "20_output" / "60-csv2geopackage"
PMTILES = VIEWER / "20-data" / "pmtiles" / "detail" / "測地成果2011_zone09.pmtiles"
OGR = Path(r"C:\Program Files\QGIS 3.44.9\bin\ogrinfo.exe")

SAMPLES = [
    ("H_13113.csv:682", "2B171"),
    ("T_S_13113.csv:53", "1A086"),
    ("T_13113.csv:22", "10A22"),
]


def gpkg_name(fid: str) -> str | None:
    gpkg = GPKG_DIR / "測地成果2011_zone09.gpkg"
    con = sqlite3.connect(gpkg)
    cur = con.execute(
        """
        SELECT COALESCE(
          NULLIF(NULLIF(TRIM("街区点・補助点名称"), ''), '街区点・補助点名称'),
          NULLIF(NULLIF(TRIM("基準点等名称"), ''), '基準点等名称'),
          NULLIF(TRIM("名称"), ''),
          NULLIF(TRIM("基準点コード"), ''),
          ''
        ) FROM kijyunten WHERE feature_id = ?
        """,
        (fid,),
    )
    row = cur.fetchone()
    con.close()
    return row[0] if row else None


def pmtiles_name(fid: str, pmtiles_path: Path = PMTILES) -> str | None:
    if not OGR.is_file():
        return None
    sql = f"SELECT name FROM kijyunten WHERE id = '{fid}'"
    proc = subprocess.run(
        [str(OGR), "-q", "-sql", sql, str(pmtiles_path)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if proc.returncode != 0:
        return f"ERROR: {proc.stderr[:200]}"
    for line in proc.stdout.splitlines():
        if "name (String)" in line:
            return line.split("=", 1)[1].strip()
    return None


def verify_tosikanmin_zone02() -> dict:
    """都市官民データを含む zone02 で spot check。"""
    gpkg = GPKG_DIR / "測地成果2011_zone02.gpkg"
    pmt = VIEWER / "20-data" / "pmtiles" / "detail" / "測地成果2011_zone02.pmtiles"
    con = sqlite3.connect(gpkg)
    cur = con.execute(
        """
        SELECT feature_id, "基準点等名称", "基準点コード"
        FROM kijyunten
        WHERE data_system = 'tosikanmin'
          AND TRIM(COALESCE("基準点等名称", '')) <> ''
          AND TRIM(COALESCE("基準点等名称", '')) <> '基準点等名称'
        LIMIT 5
        """
    )
    rows = cur.fetchall()
    con.close()
    checks = []
    for fid, meisho, code in rows:
        pmt_name = pmtiles_name(fid, pmt) if pmt.is_file() else None
        # 修正後: name は基準点等名称（≠ 基準点コード）
        checks.append(
            {
                "feature_id": fid,
                "基準点等名称": meisho,
                "基準点コード": code,
                "pmtiles_name": pmt_name,
                "ok": pmt_name == meisho and pmt_name != code,
            }
        )
    return {"zone02_tosikanmin": checks}


def main() -> None:
    results = []
    ok = 0
    for fid, expected in SAMPLES:
        gpkg = gpkg_name(fid)
        pmt = pmtiles_name(fid)
        match = pmt == expected and gpkg == expected
        if match:
            ok += 1
        results.append(
            {
                "feature_id": fid,
                "expected": expected,
                "gpkg": gpkg,
                "pmtiles": pmt,
                "ok": match,
            }
        )

    tosi = verify_tosikanmin_zone02()
    tosi_ok = sum(1 for c in tosi["zone02_tosikanmin"] if c["ok"])

    out = {
        "samples": results,
        "passed": ok,
        "total": len(SAMPLES),
        "tosikanmin_zone02": tosi,
        "tosikanmin_passed": tosi_ok,
    }
    out_path = _SCRIPT.parent / "verify_pmtiles_name_result.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False, indent=2))
    tosi_checks = tosi["zone02_tosikanmin"]
    all_ok = ok == len(SAMPLES) and (not tosi_checks or tosi_ok == len(tosi_checks))
    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
