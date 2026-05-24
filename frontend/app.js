// GAS WebアプリのURL（デプロイ後に差し替え）
const API_URL = 'https://script.google.com/macros/s/xxxxxxxxx/exec';

function login() {
  const groupId = document.getElementById('groupId').value.trim();
  const errorEl = document.getElementById('error');
  
  if (!groupId) {
    errorEl.textContent = 'グループIDを入力してください。';
    return;
  }
  
  sessionStorage.setItem('groupId', groupId);
  
  fetch(API_URL + '?action=getTasks&groupId=' + encodeURIComponent(groupId))
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        errorEl.textContent = '無効なグループIDです。';
        sessionStorage.removeItem('groupId');
      } else {
        window.location.href = 'dashboard.html';
      }
    })
    .catch(() => {
      errorEl.textContent = 'サーバーに接続できませんでした。';
    });
}

function logout() {
  sessionStorage.removeItem('groupId');
  window.location.href = 'index.html';
}

function refreshTasks() {
  const groupId = sessionStorage.getItem('groupId');
  if (!groupId) {
    window.location.href = 'index.html';
    return;
  }
  
  const taskList = document.getElementById('taskList');
  taskList.innerHTML = '<div class="loading">読み込み中...</div>';
  
  fetch(API_URL + '?action=getTasks&groupId=' + encodeURIComponent(groupId))
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        taskList.innerHTML = '<div class="empty">データの取得に失敗しました。</div>';
        return;
      }
      renderTasks(data.tasks);
      updateSummary(data.summary);
    })
    .catch(() => {
      taskList.innerHTML = '<div class="empty">サーバーに接続できませんでした。</div>';
    });
}

function renderTasks(tasks) {
  const taskList = document.getElementById('taskList');
  
  if (!tasks || tasks.length === 0) {
    taskList.innerHTML = '<div class="empty">タスクはありません</div>';
    document.getElementById('btnDeleteAll').style.display = 'none';
    return;
  }
  
  taskList.innerHTML = tasks.map(task =>
    '<div class="task-card">' +
      '<h3>' + escapeHtml(task.task) + '</h3>' +
      '<div class="task-meta"><span>期限:</span> ' + (task.deadline || '未設定') + '</div>' +
      '<div class="task-meta"><span>担当:</span> ' + escapeHtml(task.assignee || '未設定') + '</div>' +
      '<div class="task-meta">' +
        '<span>ステータス:</span> ' +
        '<span class="badge badge-' + getStatusClass(task.status) + '">' + task.status + '</span>' +
      '</div>' +
      '<div class="task-actions">' +
        '<select onchange="updateStatus(\'' + task.taskId + '\', this.value)" data-current="' + task.status + '">' +
          '<option value="未着手"' + (task.status === '未着手' ? ' selected' : '') + '>未着手</option>' +
          '<option value="進行中"' + (task.status === '進行中' ? ' selected' : '') + '>進行中</option>' +
          '<option value="完了"'   + (task.status === '完了'   ? ' selected' : '') + '>完了</option>' +
        '</select>' +
        '<button onclick="deleteTask(\'' + task.taskId + '\')" class="btn-delete">削除</button>' +
      '</div>' +
    '</div>'
  ).join('');
  
  const hasCompleted = tasks.some(t => t.status === '完了');
  document.getElementById('btnDeleteAll').style.display = hasCompleted ? 'inline-block' : 'none';
}

function updateSummary(summary) {
  if (!summary) return;
  document.getElementById('countTodo').textContent = summary.todo || 0;
  document.getElementById('countProgress').textContent = summary.progress || 0;
  document.getElementById('countDone').textContent = summary.done || 0;
}

function updateStatus(taskId, newStatus) {
  const groupId = sessionStorage.getItem('groupId');
  if (!groupId) return;
  
  fetch(API_URL + '?action=updateStatus&groupId=' + encodeURIComponent(groupId) + '&taskId=' + encodeURIComponent(taskId) + '&newStatus=' + encodeURIComponent(newStatus))
    .then(res => res.json())
    .then(data => {
      if (data.success) refreshTasks();
    });
}

function deleteTask(taskId) {
  if (!confirm('このタスクを削除してもよろしいですか？\nこの操作は取り消せません。')) return;
  
  const groupId = sessionStorage.getItem('groupId');
  if (!groupId) return;
  
  fetch(API_URL + '?action=deleteTask&groupId=' + encodeURIComponent(groupId) + '&taskId=' + encodeURIComponent(taskId))
    .then(res => res.json())
    .then(data => {
      if (data.success) refreshTasks();
    });
}

function deleteAllCompleted() {
  if (!confirm('すべての完了タスクを削除してもよろしいですか？\nこの操作は取り消せません。')) return;
  
  const groupId = sessionStorage.getItem('groupId');
  if (!groupId) return;
  
  fetch(API_URL + '?action=deleteAllCompleted&groupId=' + encodeURIComponent(groupId))
    .then(res => res.json())
    .then(data => {
      if (data.success) refreshTasks();
    });
}

function getStatusClass(status) {
  switch (status) {
    case '未着手': return 'todo';
    case '進行中': return 'progress';
    case '完了':   return 'done';
    default:       return 'todo';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

if (window.location.pathname.includes('dashboard')) {
  const groupId = sessionStorage.getItem('groupId');
  if (!groupId) {
    window.location.href = 'index.html';
  } else {
    document.getElementById('groupLabel').textContent = groupId.substring(0, 16) + '...';
    refreshTasks();
  }
}
