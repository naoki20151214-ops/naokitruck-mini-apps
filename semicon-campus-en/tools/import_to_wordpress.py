"""英訳を WordPress (semicon-campus.com) に REST API で登録する。

事前に `python3 tools/build.py` を実行して dist/ を作っておくこと。
このサイトは /wp-json/ が 403 になるため、?rest_route= 形式で呼び出す。

使い方:
  python3 tools/import_to_wordpress.py --user USER --app-password "xxxx xxxx ..." [--only posts/825] [--publish] [--update]

- 既定は下書き（draft）で登録。--publish で公開。
- 登録結果は import_state.json に記録し、再実行時は登録済みをスキップ（--update で上書き更新）。
- Polylang Pro の REST（lang / translations）が使えればその場で言語と翻訳の紐付けを設定。
  使えない場合（Polylang 無料版など）は dist/polylang-link.php を出力するので、
  WP-CLI の `wp eval-file polylang-link.php` などで1回実行して紐付ける。
"""
import argparse, base64, json, os, sys, urllib.error, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE = os.path.join(ROOT, 'import_state.json')

ap = argparse.ArgumentParser()
ap.add_argument('--site', default='https://semicon-campus.com/')
ap.add_argument('--user', required=True)
ap.add_argument('--app-password', required=True, help='WordPress のアプリケーションパスワード')
ap.add_argument('--only', nargs='*', help='例: posts/825 pages/343（テスト用に一部だけ登録）')
ap.add_argument('--publish', action='store_true')
ap.add_argument('--update', action='store_true', help='登録済みの記事も内容を更新する')
ap.add_argument('--term-slug-suffix', default='-en', help='英語カテゴリ/タグのスラッグ末尾（日本語側との重複回避）')
args = ap.parse_args()

AUTH = 'Basic ' + base64.b64encode(f'{args.user}:{args.app_password}'.encode()).decode()


def api(method, route, data=None, query=None):
    q = {'rest_route': '/wp/v2/' + route, **(query or {})}
    url = args.site.rstrip('/') + '/?' + urllib.parse.urlencode(q)
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, method=method,
                                 headers={'Authorization': AUTH, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f'{method} {route} failed: {e.code} {e.read().decode()[:500]}')


def load(path):
    return json.load(open(os.path.join(ROOT, path), encoding='utf-8'))


state = json.load(open(STATE, encoding='utf-8')) if os.path.exists(STATE) else {'terms': {}, 'items': {}}


def save():
    json.dump(state, open(STATE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


api('GET', 'users/me')  # 認証チェック
polylang_rest = None  # レスポンスに lang があれば Polylang Pro の REST が使える

# 1) カテゴリ・タグ
for tax in ('categories', 'tags'):
    for t in load(f'en/{tax}.json'):
        key = f'{tax}/{t["id"]}'
        if key in state['terms']:
            continue
        data = {'name': t['name'], 'slug': t['slug'] + args.term_slug_suffix, 'description': t['description'],
                'lang': 'en', 'translations': {'ja': t['id']}}
        res = api('POST', tax, data)
        polylang_rest = 'lang' in res
        state['terms'][key] = res['id']
        save()
        print('term', key, '->', res['id'])

# 2) 記事・固定ページ（親ページを先に作るため pages を後回しにせず parent=0 を先頭へ）
manifest = load('dist/manifest.json')
manifest.sort(key=lambda m: (m['parent'] != 0, m['type'] != 'page'))
for m in manifest:
    key = f'{m["type"]}s/{m["id"]}'
    if args.only and key not in args.only:
        continue
    if key in state['items'] and not args.update:
        continue
    data = {
        'title': m['title'], 'excerpt': m['excerpt'], 'slug': m['slug'],
        'content': open(os.path.join(ROOT, m['file']), encoding='utf-8').read(),
        'status': 'publish' if args.publish else 'draft',
        'lang': 'en', 'translations': {'ja': m['id']},
    }
    if m['featured_media']:
        data['featured_media'] = m['featured_media']
    if m['type'] == 'post':
        data['date'] = m['date']
        data['categories'] = [state['terms'][f'categories/{c}'] for c in m['categories']]
        data['tags'] = [state['terms'][f'tags/{t}'] for t in m['tags']]
        route = 'posts'
    else:
        data['menu_order'] = m['menu_order']
        if m['template']:
            data['template'] = m['template']
        if m['parent']:
            data['parent'] = state['items'][f'pages/{m["parent"]}']['id']
        route = 'pages'
    if key in state['items']:
        res = api('POST', f'{route}/{state["items"][key]["id"]}', data)
    else:
        res = api('POST', route, data)
    polylang_rest = 'lang' in res
    state['items'][key] = {'id': res['id'], 'link': res['link'], 'planned_slug': m['slug'], 'slug': res['slug']}
    save()
    print(key, '->', res['id'], res['slug'])

# 3) スラッグが重複回避で変わった（例: -2 が付いた）記事があれば、サイト内リンクを実際の URL に直す
changed = {v['planned_slug']: v['slug'] for v in state['items'].values() if v['planned_slug'] != v['slug']}
if changed:
    print('slug changed:', changed)
    for key, v in state['items'].items():
        route, _ = key.split('/')
        m = next(x for x in manifest if f'{x["type"]}s/{x["id"]}' == key)
        html = open(os.path.join(ROOT, m['file']), encoding='utf-8').read()
        new = html
        for old, cur in changed.items():
            new = new.replace(f'/{old}/', f'/{cur}/')
        if new != html:
            api('POST', f'{route}/{v["id"]}', {'content': new})
            print('relinked', key)

# 4) Polylang 無料版向け: 言語設定と翻訳の紐付けをする PHP を出力
if not polylang_rest:
    lines = ['<?php', '// 英語版の言語設定と、日本語版との翻訳の紐付け（1回だけ実行）']
    for key, tid in state['terms'].items():
        ja_id = key.split('/')[1]
        lines.append(f"pll_set_term_language({tid}, 'en'); pll_save_term_translations(['ja' => {ja_id}, 'en' => {tid}]);")
    for key, v in state['items'].items():
        ja_id = key.split('/')[1]
        lines.append(f"pll_set_post_language({v['id']}, 'en'); pll_save_post_translations(['ja' => {ja_id}, 'en' => {v['id']}]);")
    lines.append("echo \"done\\n\";")
    open(os.path.join(ROOT, 'dist/polylang-link.php'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    print('Polylang REST not available -> wrote dist/polylang-link.php (run once with: wp eval-file dist/polylang-link.php)')

print('done:', len(state['items']), 'items')
