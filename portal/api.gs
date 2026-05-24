// ==============================================
// e-colleague Portal — API エンドポイント
// ==============================================

function doGet(e) {
  const action = e.parameter.action;
  const groupId = e.parameter.groupId;
  
  if (!action) {
    return ContentService.createTextOutput('e-colleague Portal API')
      .setMimeType(ContentService.MimeType.TEXT);
  }
  
  if (!groupId || !isAllowedGroup(groupId)) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: 'Unauthorized' })
    ).setMimeType(ContentService.MimeType.JSON);
  }
  
  switch (action) {
    case 'getTasks': {
      const tasks = getTasksForPortal(groupId);
      const summary = getSummaryForPortal(groupId);
      return ContentService.createTextOutput(
        JSON.stringify({ tasks: tasks, summary: summary })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    case 'updateStatus': {
      const taskId = e.parameter.taskId;
      const newStatus = e.parameter.newStatus;
      const result = handleUpdateStatus(taskId, newStatus);
      return ContentService.createTextOutput(
        JSON.stringify({ success: result !== null })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    case 'deleteTask': {
      const taskId = e.parameter.taskId;
      const result = deleteTaskById(taskId, groupId);
      return ContentService.createTextOutput(
        JSON.stringify({ success: result })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    case 'deleteAllCompleted': {
      const result = deleteAllCompletedTasks(groupId);
      return ContentService.createTextOutput(
        JSON.stringify({ success: result })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    case 'getMembers': {
      const members = getMembersForPortal(groupId);
      return ContentService.createTextOutput(
        JSON.stringify({ members: members })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    case 'updateAlias': {
      const targetUserId = e.parameter.userId;
      const newAlias = e.parameter.alias;
      const result = updateMemberAlias(targetUserId, groupId, newAlias);
      return ContentService.createTextOutput(
        JSON.stringify({ success: result })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    default:
      return ContentService.createTextOutput(
        JSON.stringify({ error: 'Invalid action' })
      ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  return doGet(e);
}
