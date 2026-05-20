# -*- coding: utf-8 -*-
"""ogr2ogr -sql 用: 属性スリム + 平面直角 x,y,z。"""
from __future__ import annotations

LAYER = "kijyunten"

# 有効な数値文字列（空・非数は NULL）
_NUM = (
    "TRIM({col}) <> '' AND TRIM({col}) GLOB '*[0-9]*' "
    "AND CAST(TRIM({col}) AS REAL) = CAST(TRIM({col}) AS REAL)"
)


def _num_ok(col: str) -> str:
    return _NUM.format(col=f'"{col}"')


def coord_pick_sql() -> tuple[str, str, str]:
    """x, y, z の SELECT 式（補正後優先）。"""
    hx, hy = "補正後X座標", "補正後Y座標"
    hz = "補正後標高"
    x, y = "X座標", "Y座標"
    z = "標高"
    has_hx = _num_ok(hx)
    has_hy = _num_ok(hy)
    has_hz = _num_ok(hz)
    has_x = _num_ok(x)
    has_y = _num_ok(y)
    has_z = _num_ok(z)

    x_expr = (
        f'CASE WHEN {has_hx} AND {has_hy} THEN CAST(TRIM("{hx}") AS REAL) '
        f'WHEN {has_x} AND {has_y} THEN CAST(TRIM("{x}") AS REAL) END'
    )
    y_expr = (
        f'CASE WHEN {has_hx} AND {has_hy} THEN CAST(TRIM("{hy}") AS REAL) '
        f'WHEN {has_x} AND {has_y} THEN CAST(TRIM("{y}") AS REAL) END'
    )
    z_expr = (
        f'CASE WHEN {has_hx} AND {has_hy} AND {has_hz} THEN CAST(TRIM("{hz}") AS REAL) '
        f'WHEN {has_hx} AND {has_hy} THEN NULL '
        f'WHEN {has_x} AND {has_y} AND {has_z} THEN CAST(TRIM("{z}") AS REAL) '
        f'WHEN {has_x} AND {has_y} THEN NULL END'
    )
    return x_expr, y_expr, z_expr


def _nullif_not_label(col: str, label: str) -> str:
    """空文字・列名そのもの（ヘッダ誤混入）を NULL 扱い。"""
    return (
        f"NULLIF(NULLIF(TRIM(\"{col}\"), ''), '{label}')"
    )


def name_expr_sql() -> str:
    """data_system ごとに名称列を選び、列名文字列は除外。"""
    gaiku_name = _nullif_not_label("街区点・補助点名称", "街区点・補助点名称")
    tosi_name = _nullif_not_label("都市部官民基準点名称", "都市部官民基準点名称")
    meisho = _nullif_not_label("基準点等名称", "基準点等名称")
    generic_name = 'NULLIF(TRIM("名称"), \'\')'
    code = 'NULLIF(TRIM("基準点コード"), \'\')'
    return f"""CASE COALESCE(data_system, '')
  WHEN 'tosikanmin' THEN COALESCE(
    {tosi_name},
    {meisho},
    {generic_name},
    {code},
    ''
  )
  WHEN 'gaiku' THEN COALESCE(
    {gaiku_name},
    {meisho},
    {generic_name},
    {code},
    ''
  )
  ELSE COALESCE(
    {meisho},
    {generic_name},
    {code},
    ''
  )
END"""


def base_where(extra: str | None = None) -> str:
    parts = [
        "legend_display IS NOT NULL",
        "TRIM(COALESCE(legend_display, '')) <> ''",
        "(data_system IS NULL OR data_system <> 'totiriyo')",
    ]
    if extra:
        parts.append(f"({extra})")
    return " AND ".join(parts)


def build_select_sql(
    *,
    sokuti: str,
    zone: int,
    prefix_filter: str | None = None,
) -> str:
    x_expr, y_expr, z_expr = coord_pick_sql()
    where = base_where()
    if prefix_filter:
        where += f" AND csv_prefix = '{prefix_filter}'"

    name_expr = name_expr_sql()
    return f"""
SELECT
  feature_id AS id,
  {name_expr} AS name,
  {x_expr} AS x,
  {y_expr} AS y,
  {z_expr} AS z,
  legend_display AS kind,
  data_system,
  dataset_name_ja,
  '{sokuti}' AS sokuti,
  {zone} AS zone,
  epsg AS epsg,
  yohosei_hyoji AS yohosei,
  geom
FROM {LAYER}
WHERE {where}
""".strip()
