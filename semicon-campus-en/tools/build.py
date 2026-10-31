"""英訳を WordPress に入れられる形に組み立てる。

- <!--KEEP:n--> を元の <style>/<script> に戻す（英訳版 en/keep/ があればそちらを使う）
- サイト内リンクを英語版の URL に張り替える
- dist/{posts,pages}/<id>.html と dist/manifest.json を出力する

使い方: python3 tools/build.py [--en-base https://semicon-campus.com/en/]
"""
import argparse, glob, json, os, re, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://semicon-campus.com/'

# 複数ページで共通のスクリプト内の日本語（担当エージェントを介さず一括で置換）
SCRIPT_STRINGS = {
    'この講は読了済みです。': 'You have finished this lesson.',
    '記録できませんでした。もう一度お試しください。': 'Could not save your progress. Please try again.',
    '読み終えたら、学習の記録に残しましょう。': 'When you finish reading, save it to your learning record.',
    '読了を取り消す': 'Undo "Mark as read"',
    '読了にする': 'Mark as read',
    '一覧を見る': 'See all',
    'ニュース': 'News',
    '次の必要性へ': 'Next reason',
}


def p(*a):
    return os.path.join(ROOT, *a)


ap = argparse.ArgumentParser()
ap.add_argument('--en-base', default=SITE + 'en/', help='英語版トップの URL（Polylang のディレクトリ方式なら /en/）')
args = ap.parse_args()

keys = sorted(x[len(p('en')) + 1:-5] for x in glob.glob(p('en', '*', '*.html')))
manifest, slug_map = [], {}
for k in keys:
    ja = json.load(open(p('source/ja', k + '.json'), encoding='utf-8'))
    en = json.load(open(p('en', k + '.json'), encoding='utf-8'))
    slug_map[urllib.parse.unquote(ja['slug']).lower()] = en['slug']
    manifest.append({**{f: ja[f] for f in ('id', 'type', 'link', 'date', 'parent', 'menu_order', 'template',
                                         'categories', 'tags', 'featured_media')},
                     'ja_slug': ja['slug'], 'slug': en['slug'], 'title': en['title'], 'excerpt': en['excerpt'],
                     'file': f'dist/{k}.html'})


def relink(m):
    path = urllib.parse.unquote(m.group(1)).strip('/').lower()
    if path in slug_map:
        return args.en_base + slug_map[path] + '/' + (m.group(2) or '')
    if path.startswith('category/'):
        return args.en_base + path + '/' + (m.group(2) or '')
    return m.group(0)


LINK_RE = re.compile(r'https://semicon-campus\.com/((?!wp-content/|wp-json|\?|en/)[^"\'#?\s<>]*)([#?][^"\'\s<>]*)?')

for k in keys:
    body = open(p('en', k + '.html'), encoding='utf-8').read()
    keep_file = p('en/keep', k + '.json') if os.path.exists(p('en/keep', k + '.json')) else p('source/keep', k + '.json')
    keeps = json.load(open(keep_file, encoding='utf-8'))
    for i, block in enumerate(keeps):
        for ja_s, en_s in SCRIPT_STRINGS.items():
            block = block.replace(ja_s, en_s)
        body = body.replace(f'<!--KEEP:{i}-->', block, 1)
    body = LINK_RE.sub(relink, body)
    if args.en_base.rstrip('/') + '/' != SITE:
        body = re.sub(r'(href=")' + re.escape(SITE) + r'(")', r'\1' + args.en_base + r'\2', body)
    os.makedirs(os.path.dirname(p('dist', k + '.html')), exist_ok=True)
    open(p('dist', k + '.html'), 'w', encoding='utf-8').write(body)

json.dump(manifest, open(p('dist/manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
left = [k for k in keys if '<!--KEEP:' in open(p('dist', k + '.html'), encoding='utf-8').read()]
print(f'{len(keys)} items built into dist/ ; unresolved KEEP: {left}')
