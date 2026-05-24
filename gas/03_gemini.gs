// ==============================================
// e-colleague v2.0 — Gemini API 連携
// タスクタイプ分類＋文末「〜する」統一
// ==============================================

function extractTaskFromMessage(userMessage) {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEYが設定されていません');
    return null;
  }

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
    'ユーザーの発言からタスクを抽出し、以下のJSON形式で厳密に回答してください。\n' +
    '説明やコメントは一切含めず、JSONのみを返してください。\n\n' +
    '{\n' +
    '  "is_task": true または false,\n' +
    '  "task": "タスク内容の簡潔な要約（is_taskがfalseの場合はnull）",\n' +
    '  "deadline": "YYYY-MM-DD形式の期限（不明ならnull）",\n' +
    '  "assignee": "担当者名（不明ならnull）",\n' +
    '  "is_task_complete": true または false,\n' +
    '  "missing_fields": ["task", "deadline", "assignee" のうち不足しているもの],\n' +
    '  "question": "不足項目を尋ねる自然な質問文（なければnull）",\n' +
    '  "suggested_steps": ["タスクを完了するためのステップを最大3つ"]\n' +
    '}\n\n' +
    '【重要なルール — 必ず従ってください】\n' +
    '1. 発言内に期限が明示されていない場合、deadline は null にしてください。推測で補完しないでください。\n' +
    '2. 発言内に担当者が明示されていない場合、assignee は null にしてください。\n' +
    '3. 期限と担当者の両方が発言内に明示されている場合のみ、is_task_complete: true にしてください。\n' +
    '4. どちらか一方でも欠けている場合は is_task_complete: false にし、missing_fields に不足項目を列挙してください。\n' +
    '5. 「明日」「来週の金曜」「3日後」など相対的な期限が発言内に明示されている場合は、具体的な日付に変換して deadline に設定してください。\n' +
    '6. 「スライド作らなきゃ」のような、やるべきことだけが書かれていて期限・担当者が書かれていない発言は、必ず is_task_complete: false にしてください。\n' +
    '7. 「来週水曜」は ' + nextWednesdayStr + ' です。\n' +
    '8. 「明日」は ' + tomorrowStr + ' です。\n' +
    '9. タスクでない会話（挨拶、雑談、感想など）は is_task: false にし、他のフィールドはnullにしてください。\n' +
    '10. suggested_steps は is_task_complete が true の場合のみ記載してください。\n' +
    '11. JSON以外のテキストは絶対に出力しないでください。';

  return callGeminiAPI(systemInstruction, userMessage);
}

function generateDoD(taskName, userGoal) {
  if (!GEMINI_API_KEY) return null;

  const goalContext = userGoal 
    ? 'ユーザーが「ここまでやればOK」という目安として「' + userGoal + '」と回答しています。これをベースにしてください。'
    : '';

  const systemInstruction = 'あなたはタスク管理アシスタントです。\n' +
    '以下のタスクについて、タスクタイプを判定し、「ここまでやればOK」という目安を最大3つ提案してください。\n\n' +
    'タスク: ' + taskName + '\n' +
    goalContext + '\n' +
    'タスクタイプは以下の5つから1つ選んでください:\n' +
    '- 調達・購入: 物品の入手が目的（例: 買う、発注、注文、調達）\n' +
    '- 作成・制作: 成果物の完成が目的（例: 作る、描く、書く、デザイン）\n' +
    '- 調査・思考: 結論や判断が目的（例: 調べる、考える、検討、リサーチ）\n' +
    '- 連絡・調整: 相手との合意や確定が目的（例: 連絡、聞く、確認、調整）\n' +
    '- 汎用: 上記に当てはまらない\n\n' +
    '目安の文章は必ず文末を「〜する」で統一してください。\n' +
    '「〜してください」「〜が完了している」ではなく、「〜する」で締めてください。\n\n' +
    '{\n' +
    '  "taskType": "調達・購入",\n' +
    '  "dod": ["目安1", "目安2", "目安3"]\n' +
    '}\n\n' +
    'JSON以外のテキストは出力しないでください。';

  const result = callGeminiAPI(systemInstruction, taskName);
  if (result && result.dod) {
    return { type: result.taskType || '汎用', dod: result.dod };
  }
  return null;
}

function callGeminiAPI(systemInstruction, userMessage) {
  const requestBody = {
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(GEMINI_URL + '?key=' + GEMINI_API_KEY, options);
    const resText = response.getContentText();
    const json = JSON.parse(resText);
    
    if (json.error) {
      console.error('APIエラー:', JSON.stringify(json.error, null, 2));
      return null;
    }

    if (!json.candidates || json.candidates.length === 0) {
      console.warn('回答が生成されませんでした:', resText);
      return null;
    }
    
    const outputText = json.candidates[0].content.parts[0].text;
    console.log('AI応答:', outputText);
    return JSON.parse(outputText);
    
  } catch (e) {
    console.error('Gemini処理エラー:', e);
    return null;
  }
}
