# -*- coding: utf-8 -*-
"""GPKG の name 誤り候補を集計（旧式 vs 新式 name 式）。"""
from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

_SCRIPT = Path(__file__).resolve()
VIEWER = _SCRIPT.parents[1]
PIPELINE = VIEWER / "10-pipeline"
sys.path.insert(0, str(PIPELINE))

from lib.slim_sql import name_expr_sql  # noqa: E402

REPO = VIEWER.parents[2]
GPKG_DIR = REPO / "20_output" / "60-csv2geopackage"
OUT_JSON = _SCRIPT.parent / "audit_name_gpkg_result.json"

SAMPLE_IDS = [
    "H_13113.csv:682",
    "T_S_13113.csv:53",
    "T_13113.csv:22",
]

WHERE = (
    "legend_display IS NOT NULL AND TRIM(COALESCE(legend_display,'')) <> '' "
    "AND (data_system IS NULL OR data_system <> 'totiriyo')"
)


def _old_name_expr() -> str:
    """修正前の name 式（基準点等名称なし）。"""
    return """CASE COALESCE(data_system, '')
  WHEN 'tosikanmin' THEN COALESCE(
    NULLIF(NULLIF(TRIM("都市部官民基準点名称"), ''), '都市部官民基準点名称'),
    NULLIF(TRIM("名称"), ''),
    NULLIF(TRIM("基準点コード"), ''),
    ''
  )
  WHEN 'gaiku' THEN COALESCE(
    NULLIF(NULLIF(TRIM("街区点・補助点名称"), ''), '街区点・補助点名称'),
    NULLIF(TRIM("名称"), ''),
    NULLIF(TRIM("基準点コード"), ''),
    ''
  )
  ELSE COALESCE(
    NULLIF(TRIM("名称"), ''),
    NULLIF(TRIM("基準点コード"), ''),
    ''
  )
END"""


def audit_gpkg(path: Path) -> dict:
    new_expr = name_expr_sql()
    old_expr = _old_name_expr()
    con = sqlite3.connect(path)
    cur = con.cursor()

    cur.execute(
        f"""
        SELECT data_system, kijyunten_meisho, COUNT(*)
        FROM kijyunten
        WHERE {WHERE}
          AND TRIM(COALESCE("基準点等名称", '')) <> ''
          AND TRIM(COALESCE("基準点等名称", '')) <> '基準点等名称'
          AND ({old_expr}) <> ({new_expr})
        GROUP BY data_system, kijyunten_meisho
        ORDER BY 3 DESC
        """
    )
    mismatch_by_kind = [
        {"data_system": r[0], "kijyunten_meisho": r[1], "count": r[2]} for r in cur.fetchall()
    ]

    cur.execute(
        f"""
        SELECT COUNT(*)
        FROM kijyunten
        WHERE {WHERE}
          AND TRIM(COALESCE("基準点等名称", '')) <> ''
          AND TRIM(COALESCE("基準点等名称", '')) <> '基準点等名称'
          AND ({old_expr}) <> ({new_expr})
        """
    )
    total_mismatch = cur.fetchone()[0]

    samples = {}
    for fid in SAMPLE_IDS:
        cur.execute(
            f"""
            SELECT feature_id, csv_prefix, data_system, kijyunten_meisho,
              "街区点・補助点名称", "基準点等名称", "基準点コード",
              ({old_expr}) AS name_old, ({new_expr}) AS name_new
            FROM kijyunten WHERE feature_id = ?
            """,
            (fid,),
        )
        row = cur.fetchone()
        if row:
            samples[fid] = {
                "feature_id": row[0],
                "csv_prefix": row[1],
                "data_system": row[2],
                "kijyunten_meisho": row[3],
                "街区点・補助点名称": row[4],
                "基準点等名称": row[5],
                "基準点コード": row[6],
                "name_old": row[7],
                "name_new": row[8],
            }

    con.close()
    return {
        "file": path.name,
        "total_mismatch_old_vs_new": total_mismatch,
        "mismatch_by_kind": mismatch_by_kind,
        "samples": samples,
    }


def main() -> None:
    gpkg_files = sorted(GPKG_DIR.glob("測地成果2011_zone*.gpkg"))
    if not gpkg_files:
        print(f"No GPKG in {GPKG_DIR}", file=sys.stderr)
        sys.exit(1)

    results = [audit_gpkg(p) for p in gpkg_files]
    summary = {
        "gpkg_dir": str(GPKG_DIR),
        "files": len(results),
        "total_mismatch_all": sum(r["total_mismatch_old_vs_new"] for r in results),
        "per_file": results,
    }
    OUT_JSON.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"\nWrote {OUT_JSON}")


if __name__ == "__main__":
    main()
