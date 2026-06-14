# Cloud Agent 起動用プロンプト（Instructions に貼り付け）

```
@00-temp/plam.md の「実装エージェント用プロンプト」と @00-temp/plan-3ddb.md に従い、3DDB データカタログを PoC〜MVP まで実装してください。

追加指示:
- UI は CSV ダウンロード近傍（#download-wrap 周辺）。選択式リストは表示範囲内データのみ。
- plan-3ddb.md のフェーズ 0〜5 を順に実施し、各フェーズでテスト・デバッグまで完了すること。
- main にはマージ・push しない。experiment/wip のみ作業・push すること。
- コミットメッセージは .cursorrules 通り日本語 subject。
- 完了時: npm run build、probe-3ddb-api、test:3ddb-catalog、test:download-zoom の結果を報告。
```

## 起動設定

| 項目 | 値 |
|------|-----|
| Repository | Yoshida088603/gaiku-kijunten-viewer |
| Branch | experiment/wip |
