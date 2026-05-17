# Overview PMTiles パイプライン

全国のデータ分布目安用 overview（3段グリッド）を生成します。

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
| `../20-data/pmtiles/overview/測地成果2011_national.pmtiles` | overview タイル（約 1.4 MB） |
| `../20-data/_tmp/overview_grid.gpkg` | 中間3レイヤ GPKG |
| `../20-data/manifest.json` | `overview` セクション追記 |
| `../20-data/build_overview.log` | ogr2ogr ログ |

**ビルド結果（QGIS 3.44.9）**: ソースセル 3,822 点（L1:274 / L2:801 / L3:2,747）、PMTiles `minzoom=0` `maxzoom=14`、source-layer `overview_L1`–`L3`。
検査レポートの推奨（0.35 / 0.08 / 0.03）と異なる場合は `overview_schema.json` の `grid_levels` を更新してから再ビルドしてください。

## ズーム設計

| レイヤ | cell_deg | zoom |
|--------|----------|------|
| overview_L1 | 0.35° | 0–7 |
| overview_L2 | 0.12° | 8–11 |
| overview_L3 | 0.04° | 12–14 |

detail PMTiles（`10-pipeline`）は z15–18。MapLibre で z15 以降 detail に切替。

## リンク

- [公開サイト](https://yoshida088603.github.io/gaiku-kijunten-viewer/)
- [リポジトリ](https://github.com/Yoshida088603/gaiku-kijunten-viewer)
