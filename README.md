# naokitruck-mini-apps
Xで公開する小さな実用アプリの開発記録。現役トラックドライバーがAIを使って、小さく作って改善していくリポジトリ。

## GitHub Pages
リポジトリルートの `index.html` はミニアプリのランチャーです。`apps/apps.json` を編集すると表示アプリを追加できます。

### KADOKAWA 在庫チェックについて
`apps/kadokawa-stock-check/` は `data/kadokawa-stock.json` を表示する静的アプリです。`scripts/update-kadokawa-stock.mjs` を GitHub Actions (`.github/workflows/update-kadokawa-stock.yml`) で定期実行し、KADOKAWAストアとMINTモールの在庫判定JSONを更新します。
