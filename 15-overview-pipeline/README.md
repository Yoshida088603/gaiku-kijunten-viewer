# Overview PMTiles パイプライン

全国のデータ分布目安用 overview（3段グリッド・占有セル矩形）を生成します。

## 要件

- QGIS **3.44.x**（`C:\Program Files\QGIS 3.44.9\bin` 等）
- `python-qgis-ltr.bat` / `ogr2ogr.exe`
- 入力: リポジトリ `20_output/60-csv2geopackage/`（測地成果2011・14 GPKG）

## 実行

```powershell
cd 15-overview-pipeline
.\75-inspect-granularity.ps1   # 粒度レポート
.\75-build-overview.ps1        # overview PMTiles 生成
```

## 出力

| ファイル | 内容 |
|----------|------|
| `../20-data/overview_granularity_report.json` | 検査レポート |
| `../20-data/pmtiles/overview/測地成果2011_national.pmtiles` | overview タイル（約 4.2 MB） |
| `../20-data/_tmp/overview_grid.gpkg` | 中間3レイヤ GPKG |
| `../20-data/manifest.json` | `overview` セクション追記 |
| `../20-data/build_overview.log` | ogr2ogr ログ |

**ビルド結果（QGIS 3.44.9・辺 1/4 試験）**: 占有セル **23,721** 件（L1:1,136 / L2:3,959 / L3:18,626）の **Polygon**、PMTiles **4,368,460 バイト**（`minzoom=0` `maxzoom=13`）、source-layer `overview_L1`–`L3`。10 MB 目標内・警告なし。ビューアは `fill` レイヤで一律半透明表示。
検査レポートの推奨と異なる場合は `overview_schema.json` の `grid_levels` を更新してから再ビルドしてください。

## ズーム設計

| レイヤ | cell_deg | zoom |
|--------|----------|------|
| overview_L1 | 0.0875°（従来 0.35° の 1/4） | 0–7 |
| overview_L2 | 0.03°（従来 0.12° の 1/4） | 8–11 |
| overview_L3 | 0.01°（従来 0.04° の 1/4） | 12–13 |

detail PMTiles（`10-pipeline`）は z13–17。**z13 で overview と detail を重ね表示**（ビューア側で overview 透明度を z12–14 でフェード）。

## リンク

- [公開サイト](https://yoshida088603.github.io/gaiku-kijunten-viewer/)
- [リポジトリ](https://github.com/Yoshida088603/gaiku-kijunten-viewer)
