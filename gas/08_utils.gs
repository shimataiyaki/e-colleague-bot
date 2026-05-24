// ==============================================
// e-colleague v2.0 — ユーティリティ
// ==============================================

function encryptText(plainText) {
  if (!ENCRYPTION_KEY || !plainText) return plainText;
  const cipher = new cCryptoGS.Cipher(ENCRYPTION_KEY, 'aes');
  return cipher.encrypt(plainText);
}

function decryptText(encryptedText) {
  if (!ENCRYPTION_KEY || !encryptedText) return encryptedText;
  const cipher = new cCryptoGS.Cipher(ENCRYPTION_KEY, 'aes');
  return cipher.decrypt(encryptedText);
}

function activateWorkerSafely() {
  const triggers = ScriptApp.getProjectTriggers();
  const alreadyExists = triggers.some(t => t.getHandlerFunction() === 'processQueue');
  if (!alreadyExists) {
    ScriptApp.newTrigger('processQueue').timeBased().after(1000).create();
  }
}

function pushToQueue(event) {
  const cache = CacheService.getScriptCache();
  const queue = JSON.parse(cache.get('MSG_QUEUE') || "[]");
  queue.push({
    replyToken: event.replyToken,
    messageText: event.message ? event.message.text : '',
    groupId: event.source ? event.source.groupId || '' : '',
    userId: event.source ? event.source.userId || '' : ''
  });
  cache.put('MSG_QUEUE', JSON.stringify(queue), 600);
}

function popFromQueue() {
  const cache = CacheService.getScriptCache();
  const queue = JSON.parse(cache.get('MSG_QUEUE') || "[]");
  if (queue.length === 0) return null;
  
  const event = queue.shift();
  cache.put('MSG_QUEUE', JSON.stringify(queue), 600);
  return event;
}

function cleanUpTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'processQueue') ScriptApp.deleteTrigger(t);
  });
}

function replyToLine(token, text) {
  const url = 'https://api.line.me/v2/bot/message/reply';
  try {
    UrlFetchApp.fetch(url, {
      'headers': { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + LINE_TOKEN },
      'method': 'post',
      'payload': JSON.stringify({ 'replyToken': token, 'messages': [{ 'type': 'text', 'text': text }] }),
      'muteHttpExceptions': true
    });
  } catch (e) {
    console.error('LINE返信失敗:', e);
  }
}

function replyFlexMessage(token, flexContent) {
  const url = 'https://api.line.me/v2/bot/message/reply';
  try {
    UrlFetchApp.fetch(url, {
      'headers': { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + LINE_TOKEN },
      'method': 'post',
      'payload': JSON.stringify({ 'replyToken': token, 'messages': [flexContent] }),
      'muteHttpExceptions': true
    });
  } catch (e) {
    console.error('Flex Message送信失敗:', e);
  }
}

function getLINEProfile(userId) {
  const url = 'https://api.line.me/v2/bot/profile/' + userId;
  try {
    const response = UrlFetchApp.fetch(url, {
      'headers': { 'Authorization': 'Bearer ' + LINE_TOKEN },
      'method': 'get',
      'muteHttpExceptions': true
    });
    const profile = JSON.parse(response.getContentText());
    if (profile.displayName) {
      return profile.displayName;
    }
  } catch (e) {
    console.error('プロフィール取得エラー:', e);
  }
  return null;
}

function createResponse(msg) {
  return ContentService.createTextOutput(JSON.stringify({status: msg}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return createResponse("e-colleague System is Active");
}
