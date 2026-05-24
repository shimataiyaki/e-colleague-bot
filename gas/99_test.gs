// ==============================================
// e-colleague v2.0 — テスト関数
// ==============================================

function testSheetAccess() {
  const ssId = PROP.getProperty('SPREADSHEET_ID');
  console.log('SPREADSHEET_ID:', ssId ? ssId : '未設定');
  if (!ssId) return;
  
  try {
    const ss = SpreadsheetApp.openById(ssId);
    console.log('スプレッドシート名:', ss.getName());
    console.log('シート一覧:', ss.getSheets().map(s => s.getName()).join(', '));
    console.log('アクセス成功');
  } catch (e) {
    console.error('アクセス失敗:', e.toString());
  }
}

function testGemini() {
  const apiKey = PROP.getProperty('GEMINI_API_KEY');
  if (!apiKey) { console.error('GEMINI_API_KEYが未設定'); return; }
  
  const url = GEMINI_URL + '?key=' + apiKey;
  const payload = {
    contents: [{ parts: [{ text: 'こんにちは。あなたの名前を教えてください。' }] }],
    generationConfig: { responseMimeType: "application/json" }
  };
  
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  
  console.log('ステータス:', response.getResponseCode());
  console.log('応答:', response.getContentText());
}

function listAvailableModels() {
  const apiKey = PROP.getProperty('GEMINI_API_KEY');
  const url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey;
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const data = JSON.parse(response.getContentText());
  
  console.log('利用可能な全モデル:');
  data.models.forEach(m => {
    const name = m.name.split('/').pop();
    console.log('  - ' + name);
  });
}

function testContextSave() {
  saveContext('test-group', 'test-user', 'テストメッセージ', 'task_hint', { keyword: 'テスト' });
  console.log('コンテキスト保存テスト完了');
}

function testResolveAssignee() {
  const result = resolveAssignee('田中', 'test-group', null);
  console.log('解決結果:', result);
}
