// ==============================================
// e-colleague v2.0 — コンテキスト管理
// 担当者強制置換＋トリガー発言者を明示的に担当者に設定
// ==============================================

function saveContext(groupId, userId, message, intent, extractedData) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(CONTEXTS_SHEET);
  const timestamp = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
  
  sheet.appendRow([
    timestamp,
    groupId,
    userId,
    encryptText(message),
    intent,
    encryptText(JSON.stringify(extractedData)),
    false
  ]);
}

function getRecentContexts(groupId, limit) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(CONTEXTS_SHEET);
  const data = sheet.getDataRange().getValues();
  const contexts = [];
  
  for (let i = data.length - 1; i >= 1 && contexts.length < limit; i--) {
    const row = data[i];
    if (!row[0]) continue;
    if (row[1] === groupId && row[6] === false) {
      contexts.push({
        timestamp: row[0],
        groupId: row[1],
        userId: row[2],
        message: decryptText(row[3]),
        intent: row[4],
        extractedData: row[5] ? JSON.parse(decryptText(row[5])) : {},
        isProcessed: row[6]
      });
    }
  }
  return contexts.reverse();
}

function markContextsAsProcessed(groupId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(CONTEXTS_SHEET);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === groupId && data[i][6] === false) {
      sheet.getRange(i + 1, 7).setValue(true);
    }
  }
}

function isTriggerKeyword(message) {
  const keywords = getConfigValue('TRIGGER_KEYWORDS') || DEFAULT_TRIGGER_KEYWORDS;
  const keywordList = keywords.split(',').map(k => k.trim());
  return keywordList.some(keyword => message.includes(keyword));
}

function buildTaskFromContexts(groupId, userId, triggerMessage) {
  const contexts = getRecentContexts(groupId, 20);
  if (contexts.length === 0) return null;
  
  const today = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd");
  const tomorrow = Utilities.formatDate(new Date(Date.now() + 86400000), "Asia/Tokyo", "yyyy-MM-dd");
  
  const triggerUserProfile = getProfile(userId, groupId);
  const triggerUserName = triggerUserProfile ? triggerUserProfile.displayName : userId;
  
  let contextText = '';
  contexts.forEach((c, i) => {
    const profile = getProfile(c.userId, groupId);
    const displayName = profile ? profile.displayName : c.userId;
    contextText += '[' + (i + 1) + '] ' + displayName + ': ' + c.message + '\n';
  });
  
  contextText += '[' + (contexts.length + 1) + '] ' + triggerUserName + '（トリガー発言者・担当者候補）: ' + triggerMessage + '\n';
  
  const systemInstruction = 'あなたはタスク管理アシスタントです。今日は ' + today + ' です。\n' +
    '以下の会話履歴から、タスクとして記録すべきものを抽出してください。\n' +
    '会話の流れから、タスク内容・期限・担当者を特定できる場合は、それらを含めてください。\n\n' +
    '特に重要なルール:\n' +
    '- 最後の発言者「' + triggerUserName + '」が「俺やるわ」「私やります」「やります」などと言っている場合、この人物を担当者に設定してください。\n' +
    '- assignee には「' + triggerUserName + '」という表示名をそのまま入れてください。「自分」「未設定」「未定」は禁止です。\n' +
    '- 期限が「明日」なら ' + tomorrow + ' を使用してください。\n' +
    '- 「明日までに」だけで期限が特定できる場合は、deadline に ' + tomorrow + ' を設定してください。\n' +
    '- タスク内容・期限・担当者の3つがすべて揃ったら is_task_complete: true にしてください。\n\n' +
    '会話履歴:\n' + contextText + '\n' +
    '以下のJSON形式で返してください:\n' +
    '{\n' +
    '  "is_task": true,\n' +
    '  "task": "タスク内容の要約",\n' +
    '  "deadline": "YYYY-MM-DD（不明ならnull）",\n' +
    '  "assignee": "担当者名（トリガー発言者の表示名を入れる。「未設定」「未定」「自分」禁止）",\n' +
    '  "is_task_complete": true or false,\n' +
    '  "missing_fields": ["不足項目のリスト"],\n' +
    '  "question": "不足項目を尋ねる質問文（なければnull）",\n' +
    '  "suggested_steps": ["最大3ステップ"]\n' +
    '}\n\n' +
    'JSON以外のテキストは出力しないでください。';

  const taskData = callGeminiAPI(systemInstruction, triggerMessage);
  
  if (taskData && taskData.is_task) {
    if (!taskData.assignee || taskData.assignee === '自分' || taskData.assignee === '未設定' || taskData.assignee === '未定') {
      taskData.assignee = triggerUserName;
      console.log('担当者を強制置換: → ' + triggerUserName);
    }
  }
  
  return taskData;
}
