// localStorageのキー
const STORAGE_KEY = "nextOneTaskData";

// アプリ状態
let state = {
  pending: [],
  completed: [],
};

const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const currentTaskContent = document.getElementById("current-task-content");
const doneButton = document.getElementById("done-button");
const remainingList = document.getElementById("remaining-list");
const completedList = document.getElementById("completed-list");

// 保存データ読み込み
function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    state.pending = Array.isArray(parsed.pending) ? parsed.pending : [];
    state.completed = Array.isArray(parsed.completed) ? parsed.completed : [];
  } catch {
    state = { pending: [], completed: [] };
  }
}

// 保存
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// 画面描画
function render() {
  renderCurrentTask();
  renderRemainingTasks();
  renderCompletedTasks();
}

function renderCurrentTask() {
  const current = state.pending[0];

  if (!current) {
    currentTaskContent.innerHTML = '<p id="empty-message">未完了タスクはありません 🎉</p>';
    doneButton.disabled = true;
    return;
  }

  currentTaskContent.innerHTML = `<p class="current-title">${escapeHtml(current)}</p>`;
  doneButton.disabled = false;
}

function renderRemainingTasks() {
  remainingList.innerHTML = "";

  if (state.pending.length <= 1) {
    remainingList.innerHTML = "<li>残りタスクはありません</li>";
    return;
  }

  state.pending.slice(1).forEach((task) => {
    const li = document.createElement("li");
    li.textContent = task;
    remainingList.appendChild(li);
  });
}

function renderCompletedTasks() {
  completedList.innerHTML = "";

  if (state.completed.length === 0) {
    completedList.innerHTML = "<li>まだ完了タスクはありません</li>";
    return;
  }

  state.completed.forEach((task) => {
    const li = document.createElement("li");
    li.textContent = task;
    li.className = "completed-item";
    completedList.appendChild(li);
  });
}

// XSS対策の簡易エスケープ
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// タスク追加
taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const newTask = taskInput.value.trim();
  if (!newTask) return;

  state.pending.push(newTask);
  saveState();
  render();
  taskInput.value = "";
  taskInput.focus();
});

// 現在タスクを完了にする
doneButton.addEventListener("click", () => {
  const current = state.pending.shift();
  if (!current) return;

  state.completed.unshift(current);
  saveState();
  render();
});

loadState();
render();
