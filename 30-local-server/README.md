# 30-local-server

ビルド済み `dist/` を GitHub Pages と同じ URL 構成で配信するローカル HTTP サーバーです。

## 前提

- Node.js 20 以降
- 親ディレクトリで `npm install` 済み
- [`../20-data/`](../20-data/) に PMTiles と `manifest.json` があること（`npm run build` で `dist/data/` にコピーされます）

## 起動

### ワンコマンド（推奨・Windows）

```powershell
cd 10_pipeline\70-maplibre\gaiku-kijunten-viewer
.\30-local-server\start.ps1
```

`dist/` が無い場合は自動で `npm run build` し、ブラウザで次の URL を開きます。

`http://localhost:8765/gaiku-kijunten-viewer/`

### npm スクリプト

```powershell
npm run build          # 初回または更新後
npm run serve:local    # サーバ起動のみ
```

ポート変更: `$env:PORT=9000; npm run serve:local` または `node 30-local-server/serve.mjs --port 9000`

## 確認手順

1. 系（zone）を選択（既定は第9系）
2. 地図を拡大し、overview（青い集約点）から detail（SVG シンボル）へ切り替わること
3. 凡例に SVG アイコンが表示されること
4. 「土地利用を表示」で totiriyo 系が出ること

## `npm run dev` との違い

| | `npm run dev` | `30-local-server` |
|---|---------------|-------------------|
| 用途 | 開発（HMR） | 本番同等の確認 |
| 配信元 | Vite + `20-data` を `/data` | ビルド済み `dist/` |
| base パス | `/gaiku-kijunten-viewer/` | 同左 |
| PMTiles | Vite ミドルウェア | HTTP Range 対応静的配信 |

DVD 納品前や GitHub Pages デプロイ前の最終確認に使います。
