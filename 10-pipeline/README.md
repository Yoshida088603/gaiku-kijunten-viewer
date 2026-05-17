# GPKG → PMTiles パイプライン

測地成果2011 GPKG（14本）を detail PMTiles に変換します。

## 要件

- **QGIS 3.44.x** 同梱の `python-qgis.bat` または `python-qgis-ltr.bat` と `ogr2ogr.exe`（OSGeo4W 3.40 不可）
- 標準インストール例: `C:\Program Files\QGIS 3.44.9\bin`
- 入力: リポジトリルート `20_output/60-csv2geopackage/`
- 出力: `../20-data/pmtiles/detail/`

## 実行

```powershell
cd 10-pipeline
.\70-gpkg2pmtiles.ps1 -Zones 11   # 試作
.\70-gpkg2pmtiles.ps1             # 全14本
```

`QGIS_BIN` または `-QgisBin` で 3.44 の `bin` を指定できます。

## 公開サイト

- リポジトリ: https://github.com/Yoshida088603/gaiku-kijunten-viewer
- GitHub Pages（MapLibre、未デプロイ時は 404 のことがあります）: https://yoshida088603.github.io/gaiku-kijunten-viewer/
