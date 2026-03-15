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

  // KADOKAWAストアでも、購入導線があれば「在庫あり」を優先して返す。
  if (/在庫あり|カートに入れる|購入する|注文する|今すぐ購入/i.test(text)) {
    return { status: '在庫あり' };
  }

  if (/在庫なし|売り切れ|SOLD\s?OUT|販売終了/i.test(text)) {
    return { status: '在庫なし' };
  }

  return {
    status: '要確認',
    reason: '在庫あり/なしを示す文言が見つからないため、商品ページを直接確認してください',
  };
}

function parseMintMallStatus(html) {
  const text = normalizeHtmlText(html);

  // MINTモールは「カートに追加」ボタンが表示されていれば購入可能とみなす。
  if (/カートに追加|カートに入れる|購入する|在庫あり|Add to cart/i.test(text)) {
    return { status: '在庫あり' };
  }

  if (/売り切れ|在庫切れ|SOLD\s?OUT|品切れ/i.test(text)) {
    return { status: '在庫なし' };
  }

  return {
    status: '要確認',
    reason: '在庫あり/なしを示す文言が見つからないため、商品ページを直接確認してください（別ページを取得した可能性があります）',
  };
}

async function fetchStatus(target) {
  const response = await fetch(target.url, {
    headers: {
      'user-agent': 'naokitruck-mini-apps-stock-check/1.0',
      'accept-language': 'ja,en;q=0.9',
      accept: 'text/html,application/xhtml+xml',
      referer: 'https://www.google.com/',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
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
      const result = await fetchStatus(target);
      const item = {
        name: target.name,
        url: target.url,
        status: result.status,
      };

      if (result.reason) {
        item.reason = result.reason;
      }

      return item;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return {
        name: target.name,
        url: target.url,
        status: '取得失敗',
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
    const details = [];
    if (item.reason) details.push(`reason: ${item.reason}`);
    if (item.error) details.push(`error: ${item.error}`);
    console.log(`${item.name}: ${item.status}${details.length > 0 ? ` (${details.join(', ')})` : ''}`);
  }
  console.log(`Updated ${OUTPUT_PATH.pathname}`);
}

main();
