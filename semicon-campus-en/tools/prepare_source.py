"""WordPress REST の JSON から翻訳用の原文ファイルを作る。

<style>/<script> は翻訳不要なので <!--KEEP:n--> に置き換え、keep/ に保存する。
"""
import glob, html, json, os, re, sys

src_dir, out_dir = sys.argv[1], sys.argv[2]
KEEP_RE = re.compile(r'<(style|script)\b[^>]*>.*?</\1>', re.S | re.I)

items = []
for f in sorted(glob.glob(os.path.join(src_dir, 'posts-*.json'))):
    items += [dict(x, _type='post') for x in json.load(open(f, encoding='utf-8'))]
items += [dict(x, _type='page') for x in json.load(open(os.path.join(src_dir, 'pages-1.json'), encoding='utf-8'))]

for x in items:
    kind = x['_type'] + 's'
    for d in ('ja', 'keep'):
        os.makedirs(os.path.join(out_dir, 'source', d, kind), exist_ok=True)
    keeps = []
    def stash(m):
        keeps.append(m.group(0))
        return f'<!--KEEP:{len(keeps) - 1}-->'
    body = KEEP_RE.sub(stash, x['content']['rendered'])
    base = os.path.join(out_dir, 'source', '%s', kind, str(x['id']))
    open(base % 'ja' + '.html', 'w', encoding='utf-8').write(body)
    json.dump(keeps, open(base % 'keep' + '.json', 'w', encoding='utf-8'), ensure_ascii=False)
    meta = {
        'id': x['id'], 'type': x['_type'], 'slug': x['slug'], 'link': x['link'],
        'date': x['date'], 'modified': x['modified'], 'parent': x.get('parent', 0),
        'menu_order': x.get('menu_order', 0), 'template': x.get('template', ''),
        'categories': x.get('categories', []), 'tags': x.get('tags', []),
        'featured_media': x.get('featured_media', 0),
        'title': html.unescape(x['title']['rendered']),
        'excerpt': html.unescape(re.sub(r'<[^>]+>', '', x['excerpt']['rendered'])).strip(),
    }
    json.dump(meta, open(base % 'ja' + '.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

for t in ('categories', 'tags'):
    terms = [{'id': c['id'], 'name': html.unescape(c['name']), 'slug': c['slug'], 'parent': c.get('parent', 0),
              'description': c.get('description', '')} for c in json.load(open(os.path.join(src_dir, f'{t}-1.json'), encoding='utf-8'))]
    json.dump(terms, open(os.path.join(out_dir, 'source', f'{t}.ja.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(items), 'items')
