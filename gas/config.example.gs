// ==============================================
// e-colleague — 設定テンプレート
// 本番環境ではこのファイルをコピーして config.gs として保存し、
// 実際の値をPropertiesServiceに設定してください。
// config.gs は .gitignore に追加されています。
// ==============================================

const PROP = PropertiesService.getScriptProperties();
const LINE_TOKEN = PROP.getProperty('LINE_CHANNEL_TOKEN');
const GEMINI_API_KEY = PROP.getProperty('GEMINI_API_KEY');
const SPREADSHEET_ID = PROP.getProperty('SPREADSHEET_ID');
const ENCRYPTION_KEY = PROP.getProperty('ENCRYPTION_KEY');
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';

// シート名
const TASKS_SHEET = 'Tasks';
const PENDING_SHEET = 'PendingTasks';
const CONFIG_SHEET = 'Config';
const GROUPS_SHEET = 'Groups';
const CONTEXTS_SHEET = 'Contexts';
const PROFILES_SHEET = 'Profiles';

// デフォルト値
const DEFAULT_TRIGGER_KEYWORDS = 'やって,お願い,私やります,任せて,頼む,やります,やる,担当します,任せろ,俺がやる,やろうか,引き受けます,俺やる,やるわ,やりますね,やっときます,対応します,やろう,私が,俺が,自分が';
