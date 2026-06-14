# 実験ブランチ運用

新機能は `experiment/wip` で試し、`main` は本番マージ前まで直接触らない。試行錯誤は `00-temp/` に置き、固まった知見だけ `knowledge.md` へ。

```powershell
git checkout experiment/wip
npm run dev
```

---

# 実装エージェント用プロンプト

`gaiku-kijunten-viewer`（MapLibre + Vite + TypeScript）の **`experiment/wip` ブランチ** で、次機能の PoC〜MVP を実装してください。

## 目的

CSV ダウンロードが有効になるズーム（`map.json` の `downloadMinZoom: 14`、既存の `downloadZoomOk`）と同タイミングで、産総研 **3DDB データカタログ** を表示する。COPC 以外（点群・Surface・Structure・CityGML 等）も含め、**ダウンロード可能なデータ**を一覧表示し、各データの **範囲を地図上にハッチ／色分け fill** で示す。

## 技術要件

- **API ベース**: `https://gsrt.digiarc.aist.go.jp/3ddb_demo/api/v1/`（参考: [aist_3ddb_client](https://github.com/aistairc/aist_3ddb_client) の `src/modules/api.ts`）
- **表示範囲検索**: `GET /services/ALL/features?area=POLYGON(...)` — 地図 bbox を WKT に変換（`moveend` で debounce、400 件上限に注意、`offset` 対応検討）
- **レスポンス**: `geometries` 配列を MapLibre 用 GeoJSON に正規化し `fill` + `line`（必要なら `fill-pattern`）で重ね表示。`service_name` ごとに色分け
- **フック**: `src/main.ts` の `updateVisibility()` / `downloadZoomOk` を流用。z14 未満・zone 未選択時は非表示
- **UI**: 右パネルまたは CSV 近傍にカタログ一覧（タイトル・種別・ライセンス）。クリックで範囲ハイライト
- **ダウンロード導線**:
  - `downloadable === true` → `/api/v1/zipdata/{reg_id}`
  - `external_link_type === 'copc'` → [potree-copc-viewer](https://github.com/Yoshida088603/potree-copc-viewer) へ `reg_id` 付きリンク
  - その他 `external_link` → 外部サイト
- **設定**: `public/config/` に 3DDB 用 URL・有効化フラグを追加可
- **利用規約**: [ABOUT_USE_3DDB_API](https://github.com/aistairc/aist_3ddb_client/blob/main/ABOUT_USE_3DDB_API.md) の免責を UI に表示

## スコープ外（やらない）

MapLibre 上での COPC 点群ストリーミング・Cesium 3D 表示。2D カタログ＋範囲表示＋ダウンロード導線に限定。

## 実装方針

- 新規コードは `src/3ddb/` 等に集約。既存 `LayerManager` のパターンに合わせる
- 最小 diff。街区基準点レイヤーとの視認性のため 3DDB 表示トグルを用意
- 検証用スクリプトは `00-temp/` または `40-debug/`（main マージ時は選別）
- コミットメッセージは `.cursorrules` 通り **日本語 subject**

## 完了条件

z14 以上で表示範囲内の 3DDB データがハッチ表示され、パネルから ZIP／COPC ビューア／外部リンクへ遷移できること。`npm run build` が通ること。
