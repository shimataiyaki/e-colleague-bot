// ==============================================
// e-colleague v2.0 — グループ管理
// ==============================================

function getConfigValue(key) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(CONFIG_SHEET);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      return data[i][1];
    }
  }
  return null;
}

function registerGroup(groupId, replyToken) {
  if (!groupId) {
    replyToLine(replyToken, '認証はグループでのみ実行できます。');
    return;
  }
  
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(GROUPS_SHEET);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === groupId) {
      replyToLine(replyToken, 'このグループはすでに登録済みです。');
      return;
    }
  }
  
  sheet.appendRow([groupId, '']);
  
  replyToLine(replyToken,
    '登録されました！\n\n' +
    'このグループでe-colleagueが使えるようになりました。\n\n' +
    'グループID: ' + groupId + '\n\n' +
    'このIDを使って管理者ポータルにログインできます。\n\n' +
    '※本サービスの利用開始をもって、利用規約に同意したものとみなします。\n' +
    '📄 https://shimataiyaki.github.io/e-colleague/docs/利用規約.pdf'
  );
  
  console.log('グループ認証完了: ' + groupId);
}

function isAllowedGroup(groupId) {
  if (!groupId) return false;
  
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(GROUPS_SHEET);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === groupId) {
      return true;
    }
  }
  return false;
}
