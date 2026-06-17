# gaiku-kijunten-viewer

**街区基準点等の地図表示** — 街区基準点等・土地活用推進調査・都市部官民基準点等を MapLibre で閲覧するビューア。

## リンク

| | URL |
|---|-----|
| **公開サイト（GitHub Pages）** | https://yoshida088603.github.io/gaiku-kijunten-viewer/ |
| **リポジトリ** | https://github.com/Yoshida088603/gaiku-kijunten-viewer |
| **元データ（G空間 CKAN）** | https://www.geospatial.jp/ckan/dataset/toshisaisei-toshibukanmin |

## 利用者向け UI

- 右上パネルにサイト名・**使い方**（ダイアログ）・凡例
- 使い方の文言は [`public/config/site.json`](public/config/site.json) で編集可能（データ出典・注意事項・操作説明）
- 左上に短い操作案内（拡大・CSV の誘導）。技術情報は「詳細（ズーム・レイヤ）」で折りたたみ表示
- 右下の CSV ダウンロード: 青ボタンに件数（例「表示範囲の 120 点をダウンロード」）、その下の白抜きラベルに「CSVでダウンロード」。z14 未満はボタン無効で拡大案内を表示
- 左下の **3DDBデータ** カタログ: z14 以上で表示範囲内の産総研 3DDB データを一覧。パネルを展開し「範囲表示」をオンにすると地図上にハッチ表示。ZIP ダウンロード・COPC ビューア・外部リンクへ遷移可能

## 機能

- 国土地理院タイル（標準地図）背景
- **overview**（広域・占有グリッド fill・z0–13、z13 で detail とラップ）と **detail**（実点・z13–17）の縮尺連動切替
- 平面直角系（測地成果2011 等）ごとの PMTiles 読込（`manifest.json` 駆動）
- z14 以上で表示範囲内の detail 点を CSV ダウンロード（z14 未満はボタン無効・拡大を案内）。UI 文言は [`src/ui/downloadButton.ts`](src/ui/downloadButton.ts) で状態に応じて切替（ready: ボタン `表示範囲の N 点をダウンロード` / ラベル `CSVでダウンロード`）。出力列は `public/config/map.json` の `csvColumns` に従う（`name`, `x`, `y`, `z`, `kind`, `dataset_name_ja`, `data_system`, `sokuti`, `zone`, `epsg`, `yohosei`, `id`）。`name` はデータ系ごとの名称列から抽出し、`dataset_name_ja` / `data_system` で街区・都市官民などを判別できる
- CSV の `x` / `y` はダウンロード時に **数学座標系 → 測量座標系** へ値だけ入れ替える（列名はそのまま）。PMTiles 内は数学座標系（x＝北、y＝東）、CSV 出力は測量座標系（x＝東、y＝北）。実装: [`src/lib/csvExport.ts`](src/lib/csvExport.ts) の `cellValue()`
- 凡例（QGIS スタイル準拠の色分け・5 表示クラス）
- detail 表示時のシンボル・凡例アイコンは [`10_pipeline/60-csv2geopackage/styles/glyphs/`](../../60-csv2geopackage/styles/glyphs/) の SVG を使用（QGIS QML と同型）
- **3DDB データカタログ**（z14 以上）: 産総研 3DDB API から表示範囲内の点群・CityGML 等を取得し、左下パネルに一覧表示。範囲表示トグルで地図上に fill／line で重ね表示（`service_name` ごとに色分け）。設定は [`public/config/3ddb.json`](public/config/3ddb.json)、実装は [`src/3ddb/`](src/3ddb/)

## ローカル開発

```powershell
cd 10_pipeline\70-maplibre\gaiku-kijunten-viewer
npm install
npm run dev
```

ブラウザで Vite の URL（例: http://localhost:5173/gaiku-kijunten-viewer/）を開きます。  
PMTiles は開発サーバが [`20-data/`](20-data/) を `/data/` として配信します。

本番ビルド:

```powershell
npm run build
npm run preview
```

`dist/data/` に `20-data` がコピーされます。

### 自動検証（Playwright）

```powershell
npm run test:download-zoom
npm run test:3ddb-catalog
```

開発サーバ（`npm run dev`）または本番同等サーバ（`npm run serve:local`）が起動している必要があります。

### 本番同等のローカル確認

GitHub Pages と同じ `dist/` 配信（PMTiles の Range 対応）:

```powershell
.\30-local-server\start.ps1
# または
npm run build
npm run serve:local
```

詳細: [30-local-server/README.md](30-local-server/README.md)

## データ

| 種別 | パス |
|------|------|
| **manifest** | [20-data/manifest.json](20-data/manifest.json) |
| **detail PMTiles** | [20-data/pmtiles/detail/](20-data/pmtiles/detail/) |
| **overview PMTiles** | [20-data/pmtiles/overview/](20-data/pmtiles/overview/) |

生成:

- detail: [10-pipeline/README.md](10-pipeline/README.md)
- overview: [15-overview-pipeline/README.md](15-overview-pipeline/README.md)

入力 GPKG: DVD ルート `20_output/60-csv2geopackage/`

## PMTiles 再生成（QGIS 3.44 必須）

点名・データ系（`name`, `dataset_name_ja`, `data_system`）を CSV に反映するには、**detail PMTiles の再生成が必須**です（`10-pipeline/lib/slim_sql.py` と `pmtiles_schema.json` を変更した場合）。

```powershell
cd 10-pipeline
.\70-gpkg2pmtiles.ps1

# 特定系のみ（例: 第9系）
.\70-gpkg2pmtiles.ps1 -Zones 9

cd ..
npm run build
```

overview も更新する場合:

```powershell
cd 15-overview-pipeline
.\75-build-overview.ps1
```

## GitHub Pages

`main` への push で [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) が `npm run build` し `dist/` を公開します。

地図シンボル用 PNG はビルド時に SVG をラスタ化して生成します。Linux / WSL でローカルビルドする場合は、日本語フォント（例: `fonts-noto-cjk`）がないと略字が正しく焼き込まれません。GitHub Actions では workflow 内で `fonts-noto-cjk` をインストールしています。

PMTiles が大きい場合は **Git LFS** の利用を検討してください（1 ファイル 100MB 未満が目安）。

## リポジトリ構成

```text
gaiku-kijunten-viewer/
├── src/                 # MapLibre アプリ
├── public/config/       # site.json（サイト名・使い方）, map.json, 3ddb.json, 凡例色
├── 10-pipeline/         # GPKG → detail PMTiles
├── 15-overview-pipeline/
├── 20-data/             # manifest + PMTiles
└── 30-local-server/     # dist 静的配信（本番同等）
```
