// ----- 永続化キーとアプリ状態 -----
const STORAGE_KEY = "kpi-log-data-v1";
const state = {
  kpis: [],
  selectedKpiId: null,
};

// ----- 画面要素 -----
const kpiListEl = document.getElementById("kpi-list");
const allHistoryEl = document.getElementById("all-history-list");
const kpiDetailScreen = document.getElementById("kpi-detail-screen");
const kpiDetailEl = document.getElementById("kpi-detail");
const kpiForm = document.getElementById("kpi-form");
const openKpiFormBtn = document.getElementById("open-kpi-form-btn");
const cancelKpiFormBtn = document.getElementById("cancel-kpi-form-btn");

// ----- 初期化 -----
init();

function init() {
  load();
  bindEvents();
  render();
}

function bindEvents() {
  openKpiFormBtn.addEventListener("click", () => {
    kpiForm.classList.remove("hidden");
  });

  cancelKpiFormBtn.addEventListener("click", () => {
    kpiForm.reset();
    kpiForm.classList.add("hidden");
  });

  kpiForm.addEventListener("submit", (event) => {
    event.preventDefault();
    createKpi();
  });

  document.getElementById("back-btn").addEventListener("click", () => {
    state.selectedKpiId = null;
    render();
  });
}

// ----- localStorage -----
function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    state.kpis = Array.isArray(parsed.kpis) ? parsed.kpis : [];
  } catch {
    state.kpis = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ kpis: state.kpis }));
}

// ----- KPI 操作 -----
function createKpi() {
  const name = document.getElementById("kpi-name").value.trim();
  const target = document.getElementById("kpi-target").value.trim();
  const unit = document.getElementById("kpi-unit").value.trim();
  const memo = document.getElementById("kpi-memo").value.trim();

  if (!name || !target || !unit) return;

  state.kpis.push({
    id: crypto.randomUUID(),
    name,
    target,
    unit,
    memo,
    tasks: [],
  });

  save();
  kpiForm.reset();
  kpiForm.classList.add("hidden");
  render();
}

function addTask(kpiId, title) {
  const kpi = state.kpis.find((item) => item.id === kpiId);
  if (!kpi || !title.trim()) return;

  kpi.tasks.push({
    id: crypto.randomUUID(),
    title: title.trim(),
    createdAt: Date.now(),
    completedAt: null,
  });

  save();
  render();
}

function completeTask(kpiId, taskId) {
  const kpi = state.kpis.find((item) => item.id === kpiId);
  if (!kpi) return;

  const task = kpi.tasks.find((item) => item.id === taskId);
  if (!task || task.completedAt) return;

  task.completedAt = Date.now();
  save();
  render();
}

// ----- 描画 -----
function render() {
  renderKpiList();
  renderAllHistory();
  renderKpiDetail();
}

function renderKpiList() {
  if (state.kpis.length === 0) {
    kpiListEl.innerHTML = '<p class="empty">まだKPIがありません。最初のKPIを作成しましょう。</p>';
    return;
  }

  kpiListEl.innerHTML = state.kpis
    .map((kpi) => {
      const incompleteCount = kpi.tasks.filter((task) => !task.completedAt).length;
      const completedCount = kpi.tasks.length - incompleteCount;

      return `
        <article class="kpi-card">
          <h3>${escapeHtml(kpi.name)}</h3>
          <p class="kpi-meta">目標: ${escapeHtml(String(kpi.target))}${escapeHtml(kpi.unit)}</p>
          <p class="kpi-meta">未完了: ${incompleteCount}件 / 完了: ${completedCount}件</p>
          <button class="btn primary full" data-action="open-detail" data-kpi-id="${kpi.id}">詳細を見る</button>
        </article>
      `;
    })
    .join("");

  kpiListEl.querySelectorAll('[data-action="open-detail"]').forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedKpiId = button.dataset.kpiId;
      render();
    });
  });
}

function renderKpiDetail() {
  const kpi = state.kpis.find((item) => item.id === state.selectedKpiId);
  if (!kpi) {
    kpiDetailScreen.style.display = "none";
    return;
  }

  kpiDetailScreen.style.display = "block";

  const incompleteTasks = kpi.tasks.filter((task) => !task.completedAt);
  const completedTasks = kpi.tasks
    .filter((task) => task.completedAt)
    .sort((a, b) => b.completedAt - a.completedAt);

  kpiDetailEl.innerHTML = `
    <h2>${escapeHtml(kpi.name)}</h2>
    <p class="kpi-meta">目標: ${escapeHtml(String(kpi.target))}${escapeHtml(kpi.unit)}</p>
    ${kpi.memo ? `<p class="memo">${escapeHtml(kpi.memo)}</p>` : ""}

    <form id="task-form" class="form">
      <label>
        アクションタスク追加
        <input id="task-title" type="text" required placeholder="例: 見込み顧客へ3件連絡" />
      </label>
      <button class="btn primary" type="submit">タスク追加</button>
    </form>

    <h3>未完了タスク</h3>
    ${renderTaskList(incompleteTasks, true)}

    <h3>完了履歴</h3>
    ${renderTaskList(completedTasks, false)}
  `;

  const taskForm = document.getElementById("task-form");
  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("task-title");
    addTask(kpi.id, input.value);
  });

  kpiDetailEl.querySelectorAll(".complete-btn").forEach((button) => {
    button.addEventListener("click", () => {
      completeTask(kpi.id, button.dataset.taskId);
    });
  });
}

function renderTaskList(tasks, showCompleteButton) {
  if (tasks.length === 0) {
    return '<p class="empty">該当タスクはありません。</p>';
  }

  return `
    <ul>
      ${tasks
        .map((task) => {
          const completedText = task.completedAt
            ? `<span class="completed-time">完了: ${formatDate(task.completedAt)}</span>`
            : "";

          return `
            <li class="task-row">
              <div>
                <p class="task-title">${escapeHtml(task.title)}</p>
                <small class="task-meta">作成: ${formatDate(task.createdAt)}</small><br />
                ${completedText}
              </div>
              ${showCompleteButton ? `<button class="btn small primary complete-btn" data-task-id="${task.id}">完了</button>` : ""}
            </li>
          `;
        })
        .join("")}
    </ul>
  `;
}

function renderAllHistory() {
  const rows = [];

  state.kpis.forEach((kpi) => {
    kpi.tasks.forEach((task) => {
      if (!task.completedAt) return;
      rows.push({
        kpiName: kpi.name,
        taskTitle: task.title,
        completedAt: task.completedAt,
      });
    });
  });

  rows.sort((a, b) => b.completedAt - a.completedAt);

  if (rows.length === 0) {
    allHistoryEl.innerHTML = '<p class="empty">まだ完了履歴はありません。</p>';
    return;
  }

  allHistoryEl.innerHTML = `
    <ul>
      ${rows
        .map(
          (row) => `
            <li class="task-row">
              <div>
                <p class="task-title">${escapeHtml(row.taskTitle)}</p>
                <small class="task-meta">KPI: ${escapeHtml(row.kpiName)}</small><br />
                <span class="completed-time">${formatDate(row.completedAt)}</span>
              </div>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

// ----- 共通ユーティリティ -----
function formatDate(value) {
  const date = new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${d} ${h}:${min}`;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
