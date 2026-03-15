const statusListEl = document.querySelector('#status-list');
const updatedAtEl = document.querySelector('#updated-at');
const refreshButton = document.querySelector('#refresh');

function statusClass(status) {
  if (status === '在庫あり') return 'status--ok';
  if (status === '在庫なし') return 'status--ng';
  if (status === '要確認') return 'status--warn';
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

function normalizeItems(data) {
  if (Array.isArray(data.items)) {
    return data.items;
  }

  return [
    {
      name: 'KADOKAWAストア',
      url: data.url,
      status: data.status,
      error: data.error,
    },
  ];
}

function renderItems(items) {
  statusListEl.innerHTML = '';

  for (const item of items) {
    const rowEl = document.createElement('article');
    rowEl.className = 'status-item';

    const storeEl = document.createElement('p');
    storeEl.className = 'store';

    if (item.url) {
      const link = document.createElement('a');
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = item.name ?? item.url;
      storeEl.append(link);
    } else {
      storeEl.textContent = item.name ?? '取得元不明';
    }

    const statusEl = document.createElement('p');
    const status = item.status ?? '要確認';
    statusEl.className = `status ${statusClass(status)}`;
    statusEl.textContent = status;

    rowEl.append(storeEl, statusEl);

    if (status === '要確認') {
      const warningEl = document.createElement('p');
      warningEl.className = 'meta warning';
      warningEl.textContent = '自動判定ができなかったため、商品ページで在庫表示を確認してください。';
      rowEl.append(warningEl);
    }

    if (item.error) {
      const errorEl = document.createElement('p');
      errorEl.className = 'meta';
      errorEl.textContent = `エラー: ${item.error}`;
      rowEl.append(errorEl);
    }

    statusListEl.append(rowEl);
  }
}

async function loadStock() {
  statusListEl.innerHTML = '<p class="meta">読み込み中...</p>';
  updatedAtEl.textContent = '';

  try {
    const res = await fetch('../../data/kadokawa-stock.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const items = normalizeItems(data);

    renderItems(items);
    updatedAtEl.textContent = `最終更新: ${formatDate(data.checkedAt)}`;
  } catch (error) {
    console.error('在庫データの読み込みに失敗:', error);
    statusListEl.innerHTML = '<p class="status status--ng">データ読み込み失敗</p>';
    updatedAtEl.textContent = '最終更新: 取得できませんでした';
  }
}

refreshButton.addEventListener('click', loadStock);
loadStock();
