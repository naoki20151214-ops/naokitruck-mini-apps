import { writeFile } from 'node:fs/promises';

const TARGET_URL = 'https://store.kadokawa.co.jp/shop/g/g4582698061298/';
const OUTPUT_PATH = new URL('../data/kadokawa-stock.json', import.meta.url);

function parseStatus(html) {
  const text = html.replace(/\s+/g, ' ');

  if (/在庫なし|売り切れ|SOLD\s?OUT/i.test(text)) return '在庫なし';
  if (/在庫あり|カートに入れる|購入する|注文する/i.test(text)) return '在庫あり';
  return '判定不可';
}

async function fetchStatus() {
  const response = await fetch(TARGET_URL, {
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
  return parseStatus(html);
}

async function main() {
  let status = '判定不可';
  let error;

  try {
    status = await fetchStatus();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const payload = {
    url: TARGET_URL,
    status,
    checkedAt: new Date().toISOString(),
    ...(error ? { error } : {}),
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Updated ${OUTPUT_PATH.pathname} => ${status}${error ? ` (error: ${error})` : ''}`);
}

main();
