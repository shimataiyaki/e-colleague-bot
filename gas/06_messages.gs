// ==============================================
// e-colleague v2.0 — Flex Message 生成
// 完了の目安（タスクタイプ表示付き）
// ==============================================

function buildCompleteMessage(extracted, taskId, dod) {
  const bodyContents = [
    { type: "text", text: "📌 内容", size: "xs", color: "#999999" },
    { type: "text", text: extracted.task, size: "md", weight: "bold", color: "#222222", wrap: true },
    { type: "separator", margin: "md", color: "#E0E0E0" },
    {
      type: "box", layout: "horizontal", spacing: "md",
      contents: [
        {
          type: "box", layout: "vertical", flex: 1,
          contents: [
            { type: "text", text: "📅 期限", size: "xs", color: "#999999" },
            { type: "text", text: extracted.deadline || '未設定', size: "sm", color: "#444444", wrap: true }
          ]
        },
        {
          type: "box", layout: "vertical", flex: 1,
          contents: [
            { type: "text", text: "🙋 担当", size: "xs", color: "#999999" },
            { type: "text", text: extracted.assignee || '未設定', size: "sm", color: "#444444", wrap: true }
          ]
        }
      ]
    },
    { type: "separator", margin: "md", color: "#E0E0E0" },
    { type: "text", text: "📊 ステータス: 未着手", size: "sm", color: "#888888" }
  ];

  if (dod && dod.dod && dod.dod.length > 0) {
    bodyContents.push({ type: "separator", margin: "md", color: "#E0E0E0" });
    
    const typeLabel = dod.type && dod.type !== '汎用' ? '（' + dod.type + '）' : '';
    bodyContents.push({ type: "text", text: '🎯 完了の目安' + typeLabel, size: "xs", color: "#999999" });
    
    dod.dod.forEach(d => {
      bodyContents.push({ type: "text", text: '  ☐ ' + d, size: "xs", color: "#666666", wrap: true });
    });
  }

  const flexMessage = {
    type: "flex",
    altText: '✅ タスクを登録しました！「' + extracted.task + '」',
    contents: {
      type: "bubble",
      header: {
        type: "box", layout: "vertical", backgroundColor: "#333333",
        contents: [
          { type: "text", text: "✅ タスクを登録しました！", color: "#FFFFFF", weight: "bold", size: "md", align: "center" }
        ]
      },
      body: {
        type: "box", layout: "vertical", spacing: "sm", backgroundColor: "#FAFAFA",
        contents: bodyContents
      },
      footer: {
        type: "box", layout: "vertical", spacing: "sm", backgroundColor: "#FAFAFA",
        contents: [
          { type: "button", style: "primary", color: "#666666",
            action: { type: "postback", label: "進行中にする", data: 'action=updateStatus&taskId=' + taskId + '&newStatus=進行中' } },
          { type: "button", style: "primary", color: "#333333",
            action: { type: "postback", label: "完了にする", data: 'action=updateStatus&taskId=' + taskId + '&newStatus=完了' } },
          { type: "button", style: "primary", color: "#999999",
            action: { type: "postback", label: "詳細を見る", data: 'action=showSteps&taskId=' + taskId } }
        ]
      }
    }
  };

  return flexMessage;
}

function buildTaskListMessage(groupId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TASKS_SHEET);
  const data = sheet.getDataRange().getValues();
  
  let activeTasks = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    if (row[6] === groupId && (row[4] === '未着手' || row[4] === '進行中')) {
      activeTasks.push({
        task: decryptText(row[1]),
        deadline: row[2],
        assignee: decryptText(row[3]),
        status: row[4]
      });
    }
  }

  if (activeTasks.length === 0) {
    return {
      type: "flex",
      altText: "現在、進行中のタスクはありません。",
      contents: {
        type: "bubble",
        body: {
          type: "box", layout: "vertical",
          contents: [
            { type: "text", text: "📋 現在、進行中のタスクはありません。", size: "md", color: "#888888", align: "center", wrap: true }
          ]
        }
      }
    };
  }

  const bubbles = [];
  for (let i = 0; i < activeTasks.length; i += 5) {
    const chunk = activeTasks.slice(i, i + 5);
    const bodyContents = [];
    
    chunk.forEach((t, idx) => {
      bodyContents.push({
        type: "box", layout: "horizontal", spacing: "md",
        contents: [
          {
            type: "box", layout: "vertical", flex: 3,
            contents: [
              { type: "text", text: t.task, size: "sm", weight: "bold", color: "#222222", wrap: true },
              { type: "text", text: '🙋 ' + (t.assignee || '未設定'), size: "xs", color: "#666666" }
            ]
          },
          {
            type: "box", layout: "vertical", flex: 2,
            contents: [
              { type: "text", text: '📅 ' + (t.deadline || '未設定'), size: "xs", color: "#888888", align: "end" },
              { type: "text", text: t.status, size: "xs", color: t.status === '進行中' ? '#FF9800' : '#999999',
