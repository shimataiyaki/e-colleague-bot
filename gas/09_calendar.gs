// ==============================================
// e-colleague v2.0 — Googleカレンダー連携
// パターンC: デフォルトカレンダー＋グループ別対応
// ==============================================

function addTaskToCalendar(taskName, deadline, assignee, taskId, groupId) {
  if (!deadline) return;
  
  const calendarId = getConfigValue('CALENDAR_' + groupId) || getConfigValue('DEFAULT_CALENDAR');
  if (!calendarId) {
    console.log('カレンダーIDが設定されていません。スキップします。');
    return;
  }
  
  try {
    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
      console.warn('カレンダーが見つかりません:', calendarId);
      return;
    }
    
    const groupSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(GROUPS_SHEET);
    const groupData = groupSheet.getDataRange().getValues();
    let groupMemo = '';
    for (let i = 1; i < groupData.length; i++) {
      if (groupData[i][0] === groupId) {
        groupMemo = groupData[i][1] || '';
        break;
      }
    }
    
    const groupLabel = groupMemo || groupId.substring(0, 8);
    const eventTitle = '【' + groupLabel + '】' + taskName + '（担当: ' + (assignee || '未設定') + '）';
    const dateObj = new Date(deadline);
    
    const event = calendar.createAllDayEvent(eventTitle, dateObj);
    
    event.setDescription(
      'e-colleagueタスクID: ' + taskId + '\n' +
      '担当: ' + assignee + '\n' +
      '期限: ' + deadline + '\n' +
      'グループID: ' + groupId
    );
    
    console.log('カレンダー登録: ' + eventTitle + ' → ' + deadline);
  } catch (e) {
    console.error('カレンダー登録エラー:', e);
  }
}
