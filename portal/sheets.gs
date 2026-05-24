// ==============================================
// e-colleague Portal — シート操作
// ==============================================

function getTasksForPortal(groupId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TASKS_SHEET);
  const data = sheet.getDataRange().getValues();
  const tasks = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    if (row[6] === groupId) {
      tasks.push({
        task: decryptText(row[1]),
        deadline: row[2] || '未設定',
        assignee: decryptText(row[3]),
        status: row[4],
        taskId: row[5]
      });
    }
  }
  
  const statusOrder = { '未着手': 0, '進行中': 1, '完了': 2 };
  tasks.sort((a, b) => {
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return (a.deadline || '9999') > (b.deadline || '9999') ? 1 : -1;
  });
  
  return tasks;
}

function getSummaryForPortal(groupId) {
  const tasks = getTasksForPortal(groupId);
  return {
    todo: tasks.filter(t => t.status === '未着手').length,
    progress: tasks.filter(t => t.status === '進行中').length,
    done: tasks.filter(t => t.status === '完了').length
  };
}

function handleUpdateStatus(taskId, newStatus) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TASKS_SHEET);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][5] === taskId) {
      const currentStatus = data[i][4];
      if (currentStatus === newStatus) return currentStatus;
      sheet.getRange(i + 1, 5).setValue(newStatus);
      return newStatus;
    }
  }
  return null;
}

function deleteTaskById(taskId, groupId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TASKS_SHEET);
  const data = sheet.getDataRange().getValues();
  
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][5] === taskId && data[i][6] === groupId) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function deleteAllCompletedTasks(groupId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TASKS_SHEET);
  const data = sheet.getDataRange().getValues();
  let deleted = 0;
  
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][4] === '完了' && data[i][6] === groupId) {
      sheet.deleteRow(i + 1);
      deleted++;
    }
  }
  return deleted > 0;
}

function getMembersForPortal(groupId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PROFILES_SHEET);
  const data = sheet.getDataRange().getValues();
  const members = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][3] === groupId) {
      members.push({
        userId: data[i][0],
        displayName: decryptText(data[i][1]),
        alias: data[i][2] || ''
      });
    }
  }
  return members;
}

function updateMemberAlias(userId, groupId, alias) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PROFILES_SHEET);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId && data[i][3] === groupId) {
      sheet.getRange(i + 1, 3).setValue(alias);
      return true;
    }
  }
  return false;
}

function isAllowedGroup(groupId) {
  if (!groupId) return false;
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(GROUPS_SHEET);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === groupId) return true;
  }
  return false;
}
