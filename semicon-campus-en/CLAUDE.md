# Semicon Campus 英語版 — WordPress への追加手順

このフォルダには semicon-campus.com（記事228本＋固定ページ26本）の英訳が入っています。
PC の Claude Code はこの手順どおりに進めれば、英語版を WordPress に追加できます。

## フォルダ構成

| パス | 中身 |
|---|---|
| `source/ja/{posts,pages}/<ID>.html / .json` | 日本語の原文（本文 HTML とタイトル等）。`<style>`/`<script>` は `<!--KEEP:n-->` に置換済み |
| `source/keep/` | `<!--KEEP:n-->` の元になる `<style>`/`<script>` |
| `en/{posts,pages}/<ID>.html / .json` | 英訳（本文 HTML と `title` / `excerpt` / `slug`）。ID は日本語版の WordPress 投稿 ID と同じ |
| `en/keep/` | 日本語 UI を含むスクリプトの英訳版（洗浄3級コースのアプリなど） |
| `en/categories.json` `en/tags.json` | カテゴリ・タグの英訳 |
| `GLOSSARY.md` | 訳語の統一ルール。追加翻訳・修正時も必ずこれに従う |
| `tools/check_translation.py` | 英訳の機械チェック（タグ数・未翻訳の日本語・スラッグなど） |
| `tools/build.py` | 英訳を WordPress 用に組み立て、`dist/` に出力（サイト内リンクを `/en/...` に張り替え） |
| `tools/import_to_wordpress.py` | `dist/` を REST API で WordPress に登録 |

## 追加手順

1. **多言語プラグインを入れる**（WordPress 管理画面で、人が行う）
   - 「Polylang」をインストールして有効化
   - 言語に「日本語（既定）」と「English（`en`）」を追加
   - URL 設定は「ディレクトリ名で言語を設定（/en/）」にする
   - 既存の記事・ページ・カテゴリはすべて日本語に割り当てる（Polylang の初期設定ウィザードで選べる）
2. **アプリケーションパスワードを作る**：管理画面 → ユーザー → プロフィール → アプリケーションパスワード
3. **組み立て**：`python3 tools/build.py`
   - チェック：`python3 tools/check_translation.py`（全件 OK になること）
4. **試しに1件だけ登録**（下書き）：
   `python3 tools/import_to_wordpress.py --user <ユーザー名> --app-password "<アプリパスワード>" --only posts/825`
   - 管理画面で下書きを開き、表示を確認する
5. **全件登録**（下書き）：`--only` を外して同じコマンドを実行
   - 結果は `import_state.json` に記録され、再実行しても二重登録されない。内容を直したら `--update` を付ける
6. **言語と翻訳の紐付け**
   - Polylang Pro なら手順5の時点で自動設定される
   - 無料版の場合は `dist/polylang-link.php` が出力されるので、`wp eval-file dist/polylang-link.php`（WP-CLI）か、
     「Code Snippets」プラグインで1回だけ実行する
7. **公開**：確認できたら `--publish --update` を付けて再実行するか、管理画面で一括公開
8. **メニュー・ウィジェット**：ヘッダー/フッターのメニューは英語用を管理画面で別途作る（Polylang の「メニューの位置」で言語ごとに割り当て）

## 注意点

- 本文は公開ページの HTML（rendered）から作っているため、ブロックエディタでは「クラシック」ブロックとして表示される。表示は元と同じ
- 画像は日本語版と同じメディアを参照している（再アップロード不要）。アイキャッチも同じ ID を設定する
- 洗浄3級コース（固定ページ 2921）の画面文言は英訳済みだが、Supabase 側に登録した小テストの問題文は日本語のまま
- 日本語版に記事を追加・更新したときは、その記事だけ同じ形式で `en/` に英訳を追加し、`check_translation.py` → `build.py` → `import_to_wordpress.py --only posts/<ID>` を実行する
- このサイトは `/wp-json/` が 403 になるため、スクリプトは `?rest_route=` 形式で API を呼んでいる
