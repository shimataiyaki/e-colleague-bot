# e-colleague v2.0 (beta) 技術仕様書

## 1. プロダクト概要

**e-colleague（イーコリーグ）** は、LINEグループ上で動作するチーム向けタスク管理AIアシスタントです。自然な会話をコンテキストとして蓄積し、「やる」「お願い」などのキーワードをトリガーにAIがタスクを自動抽出・記録します。

- **開発者**: Shimataiyaki
- **バージョン**: v2.0 (beta)
- **ライセンス**: MIT License
- **料金**: 完全無料（無料枠内で運用可能）

### コンセプト

**「発言が、タスクになる。」**

---

## 2. 技術スタック

| コンポーネント | 技術 | 用途 |
|---------------|------|------|
| **Bot基盤** | LINE Messaging API | メッセージ送受信、Flex Message表示、プロフィール取得 |
| **バックエンド** | Google Apps Script (GAS) | Webhook処理、全ビジネスロジック |
| **AI** | Gemini 3.1 Flash Lite（Google AI Studio） | タスク抽出・補完・DoD生成・コンテキスト再構成 |
| **データベース** | Google スプレッドシート | タスク保存（AES-256暗号化）、コンテキスト蓄積、プロフィール管理 |
| **暗号化** | cCryptoGS ライブラリ | タスク内容・担当者・コンテキストの暗号化・復号 |
| **カレンダー** | Google Calendar API | タスク期限の自動登録 |
| **管理者ポータル** | HTML/CSS/JS + GAS Web App | タスク管理・メンバー管理 |
| **メッセージ形式** | LINE Flex Message（JSON） | タスク登録確認カード、タスク一覧カルーセル、メニュー |
| **非同期処理** | GAS CacheService + Trigger | Webhookタイムアウト回避のキューイング |

---

## 3. システムアーキテクチャ

### 3.1 全体像
LINEグループ
↓ メッセージ送信
LINE Messaging API
↓ Webhook (POST)
Google Apps Script (doPost)
├── グループID検証（Groupsシート）
├── Contextsシートに発言を常時保存（暗号化）
├── プロフィール自動取得（LINE API → Profilesシート）
├── コマンド判定（タスク一覧 / メニュー / 完了報告）
├── トリガーキーワード検出
│ └── ゴール確認（「ここまでやればOK？」）
│ └── buildTaskFromContexts（コンテキストからタスク再構成）
│ └── Gemini 3.1 Flash Lite API呼び出し
├── タスク保存（Tasksシート / AES暗号化）
├── カレンダー登録（Google Calendar API）
└── Flex Message返信（Reply API / 完了の目安付き）


### 3.2 メッセージ判定順序
プロダクトキー認証

グループID検証

Contexts保存＋プロフィール自動取得

コマンド（タスク一覧／メニュー）

完了報告

ゴール回答待ち（goal_pending）

トリガーキーワード → ゴール確認 → タスク化

補完モード（PendingTasks）


---

## 4. スプレッドシート構成

### 4.1 Tasks シート

| 列 | 項目 | 形式 | 暗号化 |
|:--:|------|------|:---:|
| A | Timestamp | `yyyy-MM-dd HH:mm:ss` | 平文 |
| B | Task | タスク内容 | AES-256 |
| C | Deadline | `YYYY-MM-DD` | 平文 |
| D | Assignee | 担当者名（統一済み） | AES-256 |
| E | Status | `未着手` / `進行中` / `完了` | 平文 |
| F | TaskID | UUID v4 | 平文 |
| G | GroupID | LINE Group ID | 平文 |

### 4.2 Contexts シート

| 列 | 項目 | 形式 | 暗号化 |
|:--:|------|------|:---:|
| A | Timestamp | `yyyy-MM-dd HH:mm:ss` | 平文 |
| B | GroupID | LINE Group ID | 平文 |
| C | UserID | LINE User ID | 平文 |
| D | Message | 発言内容 | AES-256 |
| E | Intent | `pending` / `task_hint` 等 | 平文 |
| F | ExtractedData | 抽出データ（JSON） | AES-256 |
| G | IsProcessed | `true` / `false` | 平文 |

### 4.3 PendingTasks シート

| 列 | 項目 | 形式 | 暗号化 |
|:--:|------|------|:---:|
| A | TempID | UUID v4 | 平文 |
| B | GroupID | LINE Group ID | 平文 |
| C | UserID | LINE User ID | 平文 |
| D | PartialData | 不完全タスク情報（JSON） | AES-256 |
| E | ExpireTime | `yyyy-MM-dd HH:mm:ss`（30分後） | 平文 |

### 4.4 Profiles シート

| 列 | 項目 | 形式 | 暗号化 |
|:--:|------|------|:---:|
| A | UserID | LINE User ID | 平文 |
| B | DisplayName | LINE表示名 | AES-256 |
| C | Alias | 呼び方（カンマ区切り） | 平文 |
| D | GroupID | 所属グループID | 平文 |
| E | RegisteredAt | 初回登録日時 | 平文 |
| F | UpdatedAt | 最終更新日時 | 平文 |

### 4.5 Groups シート

| 列 | 項目 | 説明 |
|:--:|------|------|
| A | GroupID | 許可するLINEグループID |
| B | Memo | 任意のメモ（カレンダー表示に使用） |

### 4.6 Config シート

| Key | Value | 説明 |
|-----|-------|------|
| `REGISTER_KEYWORD` | `ECOL-G6T9-4K2W-M7XP` | プロダクトキー |
| `LIST_KEYWORD` | `タスク一覧` | タスク一覧表示コマンド |
| `MENU_KEYWORD` | `メニュー` | メニュー表示コマンド |
| `DONE_KEYWORDS` | `終わった,やった,完了,できた,済んだ` | チャット完了報告トリガー |
| `TRIGGER_KEYWORDS` | （20個のキーワード） | コンテキストタスク化トリガー |
| `DEFAULT_CALENDAR` | （カレンダーID） | デフォルトカレンダーID |

---

## 5. コア機能

### 5.1 コンテキスト蓄積型タスク検出

すべてのユーザー発言は暗号化されてContextsシートに保存されます。トリガーキーワードが検出されると、直近の未処理コンテキストを収集し、Geminiがタスクとして再構成します。

### 5.2 ゴール確認フロー

トリガーキーワード検出後、「ここまでやればOK」という目安をユーザーに確認します。回答があればそれをベースにDoDを生成し、なければAIが自動提案します。

### 5.3 担当者名統一

LINE APIでユーザーの表示名を取得し、Profilesシートで管理。「俺」「自分」などの代名詞もコード側で強制的に表示名に置換します。

### 5.4 完了の目安（DoD）

タスクタイプを5つに分類し、タイプに応じた「完了の目安」を最大3つ生成。文末は「〜する」で統一し、指示的でないトーンで提案します。

| タイプ | 例 |
|--------|-----|
| 調達・購入 | ガムテープを購入する、レシートを会計に提出する |
| 作成・制作 | ポスターを完成する、デザインの承認を得る |
| 調査・思考 | 調査結果をまとめる、チームに共有する |
| 連絡・調整 | 相手から返答を得る、日程を確定する |
| 汎用 | AIが自動生成 |

### 5.5 Googleカレンダー連携

タスク登録時、期限が設定されていれば自動でGoogleカレンダーに終日予定を作成。グループ別カレンダーの振り分けにも対応。

---

## 6. コマンド一覧

| コマンド | 動作 | 返信形式 |
|----------|------|:--:|
| プロダクトキー | グループ認証 | テキスト＋グループID＋利用規約リンク |
| `タスク一覧` | 未完了タスクを表示 | Flex Message（カルーセル） |
| `メニュー` | 操作メニューを表示 | Flex Message（3ボタン） |
| トリガーキーワードを含む発言 | ゴール確認 → タスク化 | Flex Message（カード＋完了の目安） |
| 完了ワードを含む発言 | 該当タスクを完了に | テキスト |

---

## 7. Flex Message デザイン仕様

| パーツ | 色コード | 文字色 |
|--------|:---:|:---:|
| ヘッダー背景 | `#333333` | `#FFFFFF` |
| タスク内容 | `#222222` | — |
| 期限・担当 | `#444444` | — |
| ステータス | `#888888` | — |
| ラベル文字 | `#999999` | — |
| 完了の目安項目 | `#666666` | — |
| 進行中ボタン | `#666666` | `#FFFFFF` |
| 完了ボタン | `#333333` | `#FFFFFF` |
| 詳細ボタン | `#999999` | `#FFFFFF` |
| ボディ背景 | `#FAFAFA` | — |
| 区切り線 | `#E0E0E0` | — |

---

## 8. セキュリティ

| 項目 | 方式 |
|------|------|
| **認証情報管理** | `PropertiesService`（GASスクリプトプロパティ） |
| **グループアクセス制御** | Groupsシート＋プロダクトキー認証 |
| **データ暗号化** | AES-256（cCryptoGS） |
| **暗号化キー管理** | `PropertiesService` |
| **タスク識別** | UUID v4 |
| **APIキー露出防止** | コード内ハードコードなし |

---

## 9. コード構成

| ディレクトリ | 内容 |
|-------------|------|
| `gas/` | Bot本体（GASコード）10ファイル |
| `portal/` | 管理者ポータルAPI（GASコード）4ファイル |
| `frontend/` | 管理者ポータルUI（HTML/CSS/JS）4ファイル |
| `docs/` | 技術仕様書 |

---

## 10. 依存ライブラリ

| ライブラリ | スクリプトID |
|-----------|-------------|
| **cCryptoGS** | `1IEkpeS8hsMSVLRdCMprij996zG6ek9UvGwcCJao_hlDMlgbWWvJpONrs` |

### 必要なOAuthスコープ

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/calendar"
  ]
}

```

---

## 11. バージョン履歴
| バージョン | 日付 | 主な変更点 |
|-----------|------|-----------|
| v1.0 (beta) | 2026-05-08	| 初回リリース |
| v1.1 (beta) | 2026-05-09 | タスク一覧、チャット完了報告、メニューコマンド |
| v2.0 (beta)	| 2026-05-15	| コンテキスト蓄積型、担当者統一、DoD、カレンダー連携、コード分割 |

---

## 12. プロジェクトサイト
[https://shimataiyaki.github.io/e-colleague/]

---

## 13. 開発者
Shimataiyaki
