const appsGrid = document.querySelector('#apps-grid');
const loadingMessage = document.querySelector('#loading');
const errorMessage = document.querySelector('#error');
const cardTemplate = document.querySelector('#app-card-template');

async function loadApps() {
  try {
    const response = await fetch('./apps/apps.json', { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const apps = await response.json();
    renderApps(apps);
    loadingMessage.hidden = true;
  } catch (error) {
    console.error('アプリ一覧の読み込みエラー:', error);
    loadingMessage.hidden = true;
    errorMessage.hidden = false;
  }
}

function renderApps(apps) {
  if (!Array.isArray(apps) || apps.length === 0) {
    loadingMessage.textContent = '公開中のアプリはまだありません。';
    return;
  }

  const fragment = document.createDocumentFragment();

  apps.forEach((app) => {
    const card = cardTemplate.content.firstElementChild.cloneNode(true);

    card.querySelector('.app-name').textContent = app.name;
    card.querySelector('.app-description').textContent = app.description;
    card.querySelector('.app-status').textContent = `ステータス: ${app.status}`;

    const openButton = card.querySelector('.open-button');
    openButton.href = app.path;

    fragment.append(card);
  });

  appsGrid.append(fragment);
}

loadApps();
