// ==============================================
// e-colleague v2.0 — メインエントリポイント
// トリガー → ゴール確認 → タスク化
// 個人トーク対応（アクティベートキー確認）
// ==============================================

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const event = postData.events[0];
    if (!event) return createResponse('ok');

    if (event.type === 'postback') {
      handlePostbackAction(event);
      return createResponse('ok');
    }

    if (!event.replyToken || event.replyToken === "00000000000000000000000000000000") {
      return createResponse('ok');
    }

    pushToQueue(event);
    activateWorkerSafely();
    return createResponse('ok');

  } catch (err) {
    console.error('doPost error:', err);
    return createResponse('error');
  }
}

function processQueue() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;

  try {
    console.log('Worker started');
    const startTime = new Date().getTime();
    
    while (new Date().getTime() - startTime < 45000) {
      const event = popFromQueue();
      if (event) {
        console.log('Processing: ' + event.messageText);
        processMessage(event);
      } else {
        Utilities.sleep(1000);
      }
    }
  } catch (err) {
    console.error('Worker error:', err);
  } finally {
    lock.releaseLock();
    cleanUpTriggers();
    console.log('Worker finished');
  }
}

function processMessage(event) {
  const userMessage = event.messageText;
  const userId = event.userId;
  const groupId = event.groupId;

  // 個人トーク処理
  if (!groupId) {
    handlePersonalChat(event);
    return;
  }

  const productKey = getConfigValue('REGISTER_KEYWORD') || getConfigValue('PRODUCT_KEY');
  if (productKey && userMessage === productKey) {
    registerGroup(groupId, event.replyToken);
    return;
  }

  if (!isAllowedGroup(groupId)) return;

  saveContext(groupId, userId, userMessage, 'pending', {});

  const existingProfile = getProfile(userId, groupId);
  if (!existingProfile) {
    const displayName = getLINEProfile(userId);
    if (displayName) {
      saveProfile(userId, displayName, groupId);
      const nameParts = displayName.split(' ');
      if (nameParts.length > 0) {
        addAlias(userId, groupId, nameParts[nameParts.length - 1]);
      }
      console.log('プロフィール登録: ' + userId + ' → ' + displayName);
    }
  }

  const listKeyword = getConfigValue('LIST_KEYWORD') || 'タスク一覧';
  if (userMessage === listKeyword) {
    const tasksMessage = buildTaskListMessage(groupId);
    replyFlexMessage(event.replyToken, tasksMessage);
    return;
  }

  const menuKeyword = getConfigValue('MENU_KEYWORD') || 'メニュー';
  if (userMessage === menuKeyword) {
    const menuMessage = buildMenuMessage();
    replyFlexMessage(event.replyToken, menuMessage);
    return;
  }

  if (isCompletionMessage(userMessage)) {
    const completedTask = handleCompletionByChat(groupId, userMessage);
    if (completedTask) {
      replyToLine(event.replyToken, 'タスク「' + completedTask + '」を完了にしました。');
    }
    return;
  }

  const goalPending = getGoalPending(groupId, userId);
  if (goalPending) {
    handleGoalResponse(event, goalPending);
    return;
  }

  if (isTriggerKeyword(userMessage)) {
    console.log('Trigger keyword detected: ' + userMessage);
    const taskData = buildTaskFromContexts(groupId, userId, userMessage);
    
    if (taskData && taskData.is_task) {
      if (taskData.is_task_complete) {
        saveGoalPending(groupId, userId, taskData);
        replyToLine(event.replyToken, 
          'タスクを検出しました：「' + taskData.task + '」\n\n' +
          'このタスクの「ここまでやればOK」という目安はありますか？\n' +
          '（なければAIが提案します）'
        );
        return;
      } else {
        savePendingTask(groupId, userId, taskData);
        replyToLine(event.replyToken, buildIncompleteMessage(taskData));
        return;
      }
    }
    return;
  }

  const pendingTask = getPendingTask(groupId, userId);
  if (pendingTask) {
    handleCompletion(event, pendingTask);
    return;
  }
}

function handlePersonalChat(event) {
  const userMessage = event.messageText;

  const menuKeyword = getConfigValue('MENU_KEYWORD') || 'メニュー';
  if (userMessage === menuKeyword) {
    const menuMessage = buildPersonalMenuMessage();
    replyFlexMessage(event.replyToken, menuMessage);
    return;
  }
}

function saveGoalPending(groupId, userId, taskData) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PENDING_SHEET);
  const tempId = Utilities.getUuid();
  const expireTime = new Date(Date.now() + 30 * 60 * 1000);
  
  const dataWithIntent = Object.assign({}, taskData, { _intent: 'goal_pending' });
  
  sheet.appendRow([
    tempId,
    groupId,
    userId,
    encryptText(JSON.stringify(dataWithIntent)),
    Utilities.formatDate(expireTime, "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss")
  ]);
  
  console.log('ゴール確認保存: ' + tempId);
}

function getGoalPending(groupId, userId) {
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
      if (partialData._intent === 'goal_pending') {
        return {
          tempId: row[0],
          groupId: row[1],
          userId: row[2],
          taskData: partialData,
          expireTime: row[4]
        };
      }
    }
  }
  return null;
}

function handleGoalResponse(event, goalPending) {
  const userMessage = event.messageText;
  const taskData = goalPending.taskData;
  const groupId = event.groupId;
  
  deletePendingTask(goalPending.tempId);
  
  const taskId = saveTaskToSheet(taskData, groupId);
  if (taskData.suggested_steps && taskData.suggested_steps.length > 0) {
    saveTaskSteps(taskId, taskData.suggested_steps);
  }
  
  const userGoal = (userMessage && userMessage !== 'なし' && userMessage !== 'ない' && userMessage !== 'スキップ') ? userMessage : null;
  const dod = generateDoD(taskData.task, userGoal);
  const flexMessage = buildCompleteMessage(taskData, taskId, dod);
  replyFlexMessage(event.replyToken, flexMessage);
  markContextsAsProcessed(groupId);
}
