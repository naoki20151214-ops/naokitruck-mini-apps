"""英訳ファイルの機械チェック。

使い方: python3 tools/check_translation.py [posts/123 pages/45 ...]
引数なしなら source/ja にある全件をチェックする。
"""
import collections, glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JA_RE = re.compile(r'[぀-ヿ㐀-鿿ｦ-ﾟ]')
TAG_RE = re.compile(r'<([a-zA-Z][\w-]*)')

keys = sys.argv[1:] or sorted(p[len(ROOT) + 11:-5] for p in glob.glob(os.path.join(ROOT, 'source/ja/*/*.html')))
bad = 0
for k in keys:
    errs = []
    ja = open(os.path.join(ROOT, 'source/ja', k + '.html'), encoding='utf-8').read()
    en_html, en_json = os.path.join(ROOT, 'en', k + '.html'), os.path.join(ROOT, 'en', k + '.json')
    if not os.path.exists(en_html) or not os.path.exists(en_json):
        print(f'NG {k}: missing en file'); bad += 1; continue
    en = open(en_html, encoding='utf-8').read()
    if re.findall(r'<!--KEEP:\d+-->', ja) != re.findall(r'<!--KEEP:\d+-->', en):
        errs.append('KEEP placeholders differ')
    cj, ce = collections.Counter(TAG_RE.findall(ja)), collections.Counter(TAG_RE.findall(en))
    diff = {t: (cj[t], ce[t]) for t in cj | ce if cj[t] != ce[t]}
    if diff:
        errs.append(f'tag counts differ (ja,en): {diff}')
    text = re.sub(r'<[^>]+>', ' ', en)
    left = JA_RE.findall(text)
    if len(left) > 0:
        snippet = [m.group(0) for m in re.finditer(r'\S*[぀-ヿ㐀-鿿]\S*', text)][:5]
        errs.append(f'{len(left)} Japanese chars remain in text: {snippet}')
    attrs = ' '.join(re.findall(r'(?:alt|title|aria-label|placeholder)="([^"]*)"', en))
    if JA_RE.search(attrs):
        errs.append('Japanese remains in alt/title/aria-label/placeholder')
    try:
        meta = json.load(open(en_json, encoding='utf-8'))
        for f in ('title', 'excerpt', 'slug'):
            if not isinstance(meta.get(f), str) or (f != 'excerpt' and not meta[f]):
                errs.append(f'json field {f} missing')
        if JA_RE.search(meta.get('title', '') + meta.get('excerpt', '')):
            errs.append('Japanese remains in json title/excerpt')
        if not re.fullmatch(r'[a-z0-9-]+', meta.get('slug', '')):
            errs.append('slug must be lowercase ASCII with hyphens')
    except ValueError as e:
        errs.append(f'json invalid: {e}')
    if errs:
        bad += 1
        print(f'NG {k}: ' + ' | '.join(errs))
    else:
        print(f'OK {k}')
print(f'{len(keys) - bad}/{len(keys)} OK')
sys.exit(1 if bad else 0)
