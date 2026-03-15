const statusEl = document.querySelector('#status');
const updatedAtEl = document.querySelector('#updated-at');
const sourceEl = document.querySelector('#source');
const refreshButton = document.querySelector('#refresh');

function statusClass(status) {
  if (status === '在庫あり') return 'status--ok';
  if (status === '在庫なし') return 'status--ng';
  return 'status--unknown';
}

function formatDate(isoString) {
  if (!isoString) return '不明';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

async function loadStock() {
  statusEl.textContent = '読み込み中...';
  statusEl.className = 'status status--unknown';

  try {
    const res = await fetch('../../data/kadokawa-stock.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const status = data.status ?? '判定不可';

    statusEl.textContent = status;
    statusEl.className = `status ${statusClass(status)}`;
    updatedAtEl.textContent = `最終更新: ${formatDate(data.checkedAt)}`;
    sourceEl.textContent = `取得元: ${data.url ?? '不明'}`;
  } catch (error) {
    console.error('在庫データの読み込みに失敗:', error);
    statusEl.textContent = 'データ読み込み失敗';
    statusEl.className = 'status status--ng';
    updatedAtEl.textContent = '最終更新: 取得できませんでした';
    sourceEl.textContent = '';
  }
}

refreshButton.addEventListener('click', loadStock);
loadStock();
