import { writeFile } from 'node:fs/promises';

const TARGETS = [
  {
    name: 'KADOKAWAストア',
    url: 'https://store.kadokawa.co.jp/shop/g/g4582698061298/',
    parser: parseKadokawaStatus,
  },
  {
    name: 'MINTモール',
    url: 'https://www.mint-mall.net/products/detail.php?product_id=868026',
    parser: parseMintMallStatus,
  },
];
const OUTPUT_PATH = new URL('../data/kadokawa-stock.json', import.meta.url);

function normalizeHtmlText(html) {
  return html.replace(/\s+/g, ' ');
}

function parseKadokawaStatus(html) {
  const text = normalizeHtmlText(html);

  if (/在庫なし|売り切れ|SOLD\s?OUT/i.test(text)) return '在庫なし';
  if (/在庫あり|カートに入れる|購入する|注文する/i.test(text)) return '在庫あり';
  return '判定不可';
}

function parseMintMallStatus(html) {
  const text = normalizeHtmlText(html);

  if (/売り切れ|在庫切れ|SOLD\s?OUT|品切れ/i.test(text)) return '在庫なし';
  if (/カートに入れる|購入する|在庫あり|Add to cart/i.test(text)) return '在庫あり';
  return '判定不可';
}

async function fetchStatus(target) {
  const response = await fetch(target.url, {
    headers: {
      'user-agent': 'naokitruck-mini-apps-stock-check/1.0',
      'accept-language': 'ja,en;q=0.9',
      accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  return target.parser(html);
}

async function main() {
  const checkedAt = new Date().toISOString();

  const items = await Promise.all(TARGETS.map(async (target) => {
    try {
      const status = await fetchStatus(target);
      return {
        name: target.name,
        url: target.url,
        status,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return {
        name: target.name,
        url: target.url,
        status: '判定不可',
        error,
      };
    }
  }));

  const payload = {
    checkedAt,
    items,
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  for (const item of items) {
    console.log(`${item.name}: ${item.status}${item.error ? ` (error: ${item.error})` : ''}`);
  }
  console.log(`Updated ${OUTPUT_PATH.pathname}`);
}

main();
