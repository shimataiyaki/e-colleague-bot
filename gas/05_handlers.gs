// ==============================================
// e-colleague v2.0 — ハンドラ
// アクティベートキー確認追加
// ==============================================

function handleCompletion(event, pendingTask) {
  const userMessage = event.messageText;
  const mergedTask = JSON.parse(decryptText(pendingTask.partialData));
  
  const today = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd");
  const dayOfWeek = new Date().getDay();
  const dayNames = ['日','月','火','水','木','金','土'];
  
  const daysUntilWednesday = (3 - dayOfWeek + 7) % 7 || 7;
  const nextWednesday = new Date();
  nextWednesday.setDate(nextWednesday.getDate() + daysUntilWednesday);
  const nextWednesdayStr = Utilities.formatDate(nextWednesday, "Asia/Tokyo", "yyyy-MM-dd");
  
  const tomorrow = new Date(Date.now() + 86400000);
  const tomorrowStr = Utilities.formatDate(tomorrow, "Asia/Tokyo", "yyyy-MM-dd");

  const systemInstruction = 'あなたはタスク管理アシスタントです。\n' +
    '今日は ' + today + '（' + dayNames[dayOfWeek] + '曜日）です。次の水曜日は ' + nextWednesdayStr + '、明日は ' + tomorrowStr + ' です。\n\n' +
    '以下の不完全なタスク情報と、ユーザーからの追加情報をマージしてください。\n' +
    'JSONのみを返してください。\n\n' +
    '不完全なタスク: ' + JSON.stringify(mergedTask) + '\n' +
    'ユーザーの追加情報: ' + userMessage + '\n\n' +
    '{\n' +
    '  "is_task": true,\n' +
    '  "task": "タスク内容の要約",\n' +
    '  "deadline": "YYYY-MM-DD",\n' +
    '  "assignee": "担当者名",\n' +
    '  "is_task_complete": true,\n' +
    '  "missing_fields": [],\n' +
    '  "question": null,\n' +
    '  "suggested_steps": ["ステップ1", "ステップ2", "ステップ3"]\n' +
    '}\n\n' +
    '【ルール】\n' +
    '1. 「来週水曜」は ' + nextWednesdayStr + ' です。\n' +
    '2. 「明日」は ' + tomorrowStr + ' です。\n' +
    '3. 3つがすべて揃ったら is_task_complete: true。\n' +
    '4. JSON以外のテキストは出力しないでください。';

  const completedTask = callGeminiAPI(systemInstruction, userMessage);

  if (completedTask && completedTask.is_task_complete) {
    const taskId = saveTaskToSheet(completedTask, event.groupId);
    deletePendingTask(pendingTask.tempId);
    
    if (completedTask.suggested_steps && completedTask.suggested_steps.length > 0) {
      saveTaskSteps(taskId, completedTask.suggested_steps);
    }
    
    const dod = generateDoD(completedTask.task, null);
    const flexMessage = buildCompleteMessage(completedTask, taskId, dod);
    replyFlexMessage(event.replyToken, flexMessage);
  } else if (completedTask) {
    updatePendingTask(pendingTask.tempId, completedTask);
    replyToLine(event.replyToken, buildIncompleteMessage(completedTask));
  } else {
    replyToLine(event.replyToken, 'すみません、うまく情報を統合できませんでした。もう一度お試しください。');
  }
}

function isCompletionMessage(userMessage) {
  const doneKeywords = getConfigValue('DONE_KEYWORDS') || '終わった,やった,完了,できた,済んだ';
  const keywords = doneKeywords.split(',').map(k => k.trim());
  return keywords.some(keyword => userMessage.includes(keyword));
}

function handleCompletionByChat(groupId, userMessage) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TASKS_SHEET);
  const data = sheet.getDataRange().getValues();
  
  const doneKeywords = getConfigValue('DONE_KEYWORDS') || '終わった,やった,完了,できた,済んだ';
  const keywords = doneKeywords.split(',').map(k => k.trim());
  let searchText = userMessage;
  keywords.forEach(k => { searchText = searchText.replace(k, ''); });
  searchText = searchText.trim();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    if (row[6] === groupId && (row[4] === '未着手' || row[4] === '進行中')) {
      const taskName = decryptText(row[1]);
      
      if (searchText && (taskName.includes(searchText) || searchText.includes(taskName))) {
        sheet.getRange(i + 1, 5).setValue('完了');
        return taskName;
      }
    }
  }
  
  if (!searchText && userMessage.length < 10) {
    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      if (!row[0]) continue;
      if (row[6] === groupId && row[4] === '進行中') {
        const taskName = decryptText(row[1]);
        sheet.getRange(i + 1, 5).setValue('完了');
        return taskName;
      }
    }
  }
  
  return null;
}

function handlePostbackAction(event) {
  const params = {};
  event.postback.data.split('&').forEach(pair => {
    const [key, value] = pair.split('=');
    params[key] = value;
  });

  if (params.action === 'updateStatus') {
    const newStatus = handleUpdateStatus(params.taskId, params.newStatus);
    if (newStatus) {
      replyToLine(event.replyToken, 'ステータスを「' + newStatus + '」に更新しました。');
    }
    return;
  }

  if (params.action === 'showSteps') {
    const stepText = handleShowSteps(params.taskId);
    if (stepText) {
      replyToLine(event.replyToken, stepText);
    } else {
      replyToLine(event.replyToken, '詳細情報が見つかりませんでした。');
    }
    return;
  }

  if (params.action === 'showCurrentKey') {
    const currentKey = getConfigValue('REGISTER_KEYWORD') || getConfigValue('PRODUCT_KEY') || '未設定';
    replyToLine(event.replyToken, 
      '現在のアクティベートキー\n\n' +
      currentKey + '\n\n' +
      'このキーをグループに送信して認証してください。'
    );
    return;
  }
}

function handleUpdateStatus(taskId, newStatus) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TASKS_SHEET);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][5] === taskId) {
      const currentStatus = data[i][4];
      if (currentStatus === newStatus) return null;
      sheet.getRange(i + 1, 5).setValue(newStatus);
      return newStatus;
    }
  }
  return null;
}

function saveTaskSteps(taskId, steps) {
  const cache = CacheService.getScriptCache();
  cache.put('STEPS_' + taskId, JSON.stringify(steps), 21600);
}

function handleShowSteps(taskId) {
  const cache = CacheService.getScriptCache();
  const data = cache.get('STEPS_' + taskId);
  if (!data) return null;
  
  const steps = JSON.parse(data);
  let msg = '実行ステップ:\n';
  steps.forEach((s, i) => {
    msg += '  ' + (i+1) + '. ' + s + '\n';
  });
  return msg;
}
