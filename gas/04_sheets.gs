// ==============================================
// e-colleague v2.0 — スプレッドシート操作
// ==============================================

function saveTaskToSheet(taskData, groupId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TASKS_SHEET);
  const taskId = Utilities.getUuid();
  const timestamp = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
  
  const resolvedAssignee = taskData.assignee 
    ? resolveAssignee(taskData.assignee, groupId, null) 
    : '未設定';
  
  sheet.appendRow([
    timestamp,
    encryptText(taskData.task),
    taskData.deadline || '',
    encryptText(resolvedAssignee),
    '未着手',
    taskId,
    groupId
  ]);
  
  addTaskToCalendar(taskData.task, taskData.deadline, resolvedAssignee, taskId, groupId);
  
  console.log('タスク保存完了: ' + taskId);
  return taskId;
}

function savePendingTask(groupId, userId, taskData) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PENDING_SHEET);
  const tempId = Utilities.getUuid();
  const expireTime = new Date(Date.now() + 30 * 60 * 1000);
  
  sheet.appendRow([
    tempId,
    groupId,
    userId,
    encryptText(JSON.stringify(taskData)),
    Utilities.formatDate(expireTime, "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss")
  ]);
  
  console.log('保留タスク保存: ' + tempId);
}

function getPendingTask(groupId, userId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PENDING_SHEET);
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    if (!row[0]) continue;
    
    const expireTime = new Date(row[4]);
    if (now > expireTime) {
      sheet.deleteRow(i + 1);
      continue;
    }
    
    if (row[1] === groupId && row[2] === userId) {
      const partialData = JSON.parse(decryptText(row[3]));
      if (partialData._intent === 'goal_pending') continue;
      return {
        tempId: row[0],
        groupId: row[1],
        userId: row[2],
        partialData: row[3],
        expireTime: row[4]
      };
    }
  }
  return null;
}

function updatePendingTask(tempId, taskData) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PENDING_SHEET);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === tempId) {
      sheet.getRange(i + 1, 4).setValue(encryptText(JSON.stringify(taskData)));
      const newExpire = Utilities.formatDate(new Date(Date.now() + 30 * 60 * 1000), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
      sheet.getRange(i + 1, 5).setValue(newExpire);
      break;
    }
  }
}

function deletePendingTask(tempId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PENDING_SHEET);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === tempId) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

function saveProfile(userId, displayName, groupId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PROFILES_SHEET);
  const data = sheet.getDataRange().getValues();
  const now = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId && data[i][3] === groupId) {
      sheet.getRange(i + 1, 2).setValue(encryptText(displayName));
      sheet.getRange(i + 1, 6).setValue(now);
      return;
    }
  }
  
  sheet.appendRow([userId, encryptText(displayName), '', groupId, now, now]);
}

function getProfile(userId, groupId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PROFILES_SHEET);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId && data[i][3] === groupId) {
      return {
        userId: data[i][0],
        displayName: decryptText(data[i][1]),
        alias: data[i][2] || '',
        groupId: data[i][3]
      };
    }
  }
  return null;
}

function addAlias(userId, groupId, alias) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PROFILES_SHEET);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId && data[i][3] === groupId) {
      const currentAlias = data[i][2] || '';
      const aliases = currentAlias ? currentAlias.split(',') : [];
      if (!aliases.includes(alias)) {
        aliases.push(alias);
        sheet.getRange(i + 1, 3).setValue(aliases.join(','));
      }
      return;
    }
  }
}

function resolveAssignee(nameHint, groupId, userId) {
  if (!nameHint || nameHint === '未設定') return nameHint || '未設定';
  
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PROFILES_SHEET);
  const data = sheet.getDataRange().getValues();
  
  if (userId) {
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId && data[i][3] === groupId) {
        return decryptText(data[i][1]);
      }
    }
  }
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][3] === groupId) {
      const aliasStr = data[i][2] || '';
      const aliases = aliasStr.split(',').map(a => a.trim());
      if (aliases.includes(nameHint)) {
        return decryptText(data[i][1]);
      }
    }
  }
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][3] === groupId) {
      const displayName = decryptText(data[i][1]);
      if (displayName && displayName.includes(nameHint)) {
        return displayName;
      }
    }
  }
  
  return nameHint;
}
