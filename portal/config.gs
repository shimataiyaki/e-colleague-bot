// ==============================================
// e-colleague Portal — 設定
// ==============================================

const PROP = PropertiesService.getScriptProperties();
const SPREADSHEET_ID = PROP.getProperty('SPREADSHEET_ID');
const ENCRYPTION_KEY = PROP.getProperty('ENCRYPTION_KEY');

const TASKS_SHEET = 'Tasks';
const GROUPS_SHEET = 'Groups';
const PROFILES_SHEET = 'Profiles';
