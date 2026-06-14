# 3DDB データカタログ実装計画

## 前提・ブランチ

- 作業ブランチ: `experiment/wip`（`main` は触らない）
- 仕様書: `00-temp/plam.md` の「実装エージェント用プロンプト」
- **UI 方針（ユーザー確定）**: カタログは **CSV ダウンロード近傍（右下 `download-wrap` 周辺）** に配置。一覧は **表示範囲内のデータのみ**（`<select>` 等の選択式リスト + ダウンロード/表示ボタン）
- 表示トリガー: 既存 `src/main.ts` の `downloadZoomOk`（`public/config/map.json` の `downloadMinZoom: 14`）と同期

---

## フェーズ 0: 環境・API 疎通（実装前）

**目的**: ブラウザ/UI なしで 3DDB API が応答し、レスポンス構造を把握する。

1. `experiment/wip` で `npm install` → `npm run dev` が起動することを確認
2. **スモークスクリプト** `40-debug/probe-3ddb-api.mjs`（新規）を作成・実行:
   - `GET https://gsrt.digiarc.aist.go.jp/3ddb_demo/api/v1/services/ALL/features?area=POLYGON(...)&limit=5`
   - テスト bbox: 東京（139.70–139.80, 35.65–35.72）
   - 出力: HTTP ステータス、`properties.all` / `properties.num`、`features[0].properties`、`geometries` の有無
3. **成功基準**: status 200、features が 1 件以上

---

## フェーズ 1: コアモジュール（`src/3ddb/`）

| ファイル | 責務 |
|----------|------|
| `src/3ddb/types.ts` | 3DDB API レスポンス型 |
| `src/3ddb/bboxWkt.ts` | `map.getBounds()` → WKT POLYGON |
| `src/3ddb/api.ts` | `fetchFeaturesInArea(wkt, opts)` — AbortController 対応 |
| `src/3ddb/geojsonNormalize.ts` | `geometries[]` → MapLibre GeoJSON |
| `src/3ddb/downloadLinks.ts` | ZIP / COPC viewer / external_link URL 生成 |
| `src/3ddb/layerController.ts` | fill + line、選択ハイライト |
| `src/3ddb/catalogUi.ts` | CSV 近傍 DOM（select + button + toggle + 免責） |

**設定** `public/config/3ddb.json`（新規）。`src/config/loadConfig.ts` に `load3ddbConfig()` を追加。

---

## フェーズ 2: `main.ts` 統合

- `updateVisibility()` / `moveend` にフック
- z14 未満・zone 未選択 → 非表示
- debounce 400ms、AbortController
- `#download-wrap` 近傍に `#ddb-catalog-wrap` を追加

---

## フェーズ 3: 手動テスト（必須）

東京（139.75, 35.68）z14+ で: UI 表示、fill 表示、select 変更、ZIP/COPC リンク、トグル OFF、CORS なし。

---

## フェーズ 4: 自動テスト・ビルド

- `40-debug/verify-3ddb-catalog.mjs`（Playwright、`?e2e=1`）
- `main.ts` に `get3ddbUi()` を test API 拡張
- `npm run test:3ddb-catalog`、`npm run test:download-zoom`、`npm run build`

---

## フェーズ 5: デバッグチェックリスト

- API 0 件 → WKT 閉じループ確認
- CORS → Vite proxy 検討
- 400 件超 → 警告表示
- geometries 空 → リストから除外
- UI 重なり → CSS 調整
- CSV 退行 → `test:download-zoom`

---

## 完了条件

- z14 以上で範囲 fill 表示、CSV 近傍リストから ZIP/COPC/外部リンクへ遷移
- 3DDB 表示トグル、利用規約短文案、`npm run build` 成功、`test:3ddb-catalog` PASS

## 想定コミット粒度

1. `chore(debug): 3DDB API 疎通スクリプトを追加`
2. `feat(3ddb): API クライアントと GeoJSON 正規化を追加`
3. `feat(3ddb): 範囲 fill レイヤーと CSV 近傍カタログ UI を追加`
4. `test(3ddb): Playwright 検証と e2e API 拡張を追加`
