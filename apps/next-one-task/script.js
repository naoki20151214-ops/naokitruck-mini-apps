// localStorageのキー
const STORAGE_KEY = "nextOneTaskData";

// アプリ状態
let state = {
  pending: [],
  completed: [],
};

const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const deadlineInput = document.getElementById("deadline-input");
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
    state.pending = normalizeTaskList(parsed.pending);
    state.completed = normalizeTaskList(parsed.completed);
  } catch {
    state = { pending: [], completed: [] };
  }
}

function normalizeTaskList(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") {
        return { title: item, deadline: "" };
      }

      if (!item || typeof item !== "object") return null;

      return {
        title: typeof item.title === "string" ? item.title : "",
        deadline: typeof item.deadline === "string" ? item.deadline : "",
      };
    })
    .filter((item) => item && item.title.trim());
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

  const deadlineClass = isOverdue(current.deadline) ? "task-deadline overdue" : "task-deadline";
  currentTaskContent.innerHTML = `
    <p class="current-title">${escapeHtml(current.title)}</p>
    ${formatDeadline(current.deadline, deadlineClass)}
  `;
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
    li.className = "task-item";

    const title = document.createElement("p");
    title.className = "task-item-title";
    title.textContent = task.title;
    li.appendChild(title);

    if (task.deadline) {
      const deadline = document.createElement("p");
      deadline.className = isOverdue(task.deadline) ? "task-deadline overdue" : "task-deadline";
      deadline.textContent = `締切: ${toJaDate(task.deadline)}`;
      li.appendChild(deadline);
    }

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
    li.className = "completed-item task-item";

    const title = document.createElement("p");
    title.className = "task-item-title";
    title.textContent = task.title;
    li.appendChild(title);

    if (task.deadline) {
      const deadline = document.createElement("p");
      deadline.className = "task-deadline";
      deadline.textContent = `締切: ${toJaDate(task.deadline)}`;
      li.appendChild(deadline);
    }

    completedList.appendChild(li);
  });
}

function formatDeadline(deadline, className) {
  if (!deadline) return "";
  return `<p class="${className}">締切: ${escapeHtml(toJaDate(deadline))}</p>`;
}

function toJaDate(dateString) {
  const [year, month, day] = dateString.split("-");
  if (!year || !month || !day) return dateString;
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function isOverdue(deadline) {
  if (!deadline) return false;

  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDate = new Date(`${deadline}T00:00:00`);

  return !Number.isNaN(dueDate.getTime()) && dueDate < todayOnly;
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
  const newTaskTitle = taskInput.value.trim();
  if (!newTaskTitle) return;

  state.pending.push({
    title: newTaskTitle,
    deadline: deadlineInput.value,
  });
  saveState();
  render();
  taskInput.value = "";
  deadlineInput.value = "";
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
