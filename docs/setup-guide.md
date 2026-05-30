# e-colleague セットアップガイド

## 概要

このガイドでは、e-colleagueを自身のLINEグループで動作させるための手順を説明します。
所要時間の目安：初回セットアップ約30〜45分

## 前提条件

- Googleアカウント（GAS、スプレッドシート、Gemini API用）
- LINE公式アカウント（Messaging APIチャネル）
- GitHubアカウント（ソースコードの入手用）

## 必要なもの

| 項目 | 入手先 |
|------|--------|
| LINEチャネルアクセストークン | LINE Developersコンソール |
| LINEチャネルシークレット | LINE Developersコンソール |
| Gemini APIキー | Google AI Studio |
| Googleスプレッドシート | Googleドライブで新規作成 |
| Googleカレンダー（オプション） | Googleカレンダーで新規作成 |

---

## Step 1: スプレッドシートの作成

### 1-1. 新規スプレッドシートを作成

Googleドライブで新規スプレッドシートを作成し、以下のシートを追加してください。

| シート名 | 役割 | ヘッダー行（1行目） |
|----------|------|---------------------|
| `Tasks` | タスク保存 | `Timestamp` `Task` `Deadline` `Assignee` `Status` `TaskID` `GroupID` |
| `PendingTasks` | 補完中タスク | `TempID` `GroupID` `UserID` `PartialData` `ExpireTime` |
| `Contexts` | 会話コンテキスト | `Timestamp` `GroupID` `UserID` `Message` `Intent` `ExtractedData` `IsProcessed` |
| `Profiles` | プロフィール管理 | `UserID` `DisplayName` `Alias` `GroupID` `RegisteredAt` `UpdatedAt` |
| `Groups` | 許可グループ | `GroupID` `Memo` |
| `Config` | 設定値 | `Key` `Value` |

### 1-2. Configシートの初期設定

| Key | Value |
|-----|-------|
| `REGISTER_KEYWORD` | （任意のプロダクトキー。例: `ECOL-G6T9-4K2W-M7XP`） |
| `LIST_KEYWORD` | `タスク一覧` |
| `MENU_KEYWORD` | `メニュー` |
| `DONE_KEYWORDS` | `終わった,やった,完了,できた,済んだ` |
| `TRIGGER_KEYWORDS` | `やって,お願い,私やります,任せて,頼む,やります,やる,担当します,任せろ,俺がやる,やろうか,引き受けます,俺やる,やるわ,やりますね,やっときます,対応します,やろう,私が,俺が,自分が` |
| `DEFAULT_CALENDAR` | （GoogleカレンダーID。オプション） |

---

## Step 2: GASプロジェクトの作成

### 2-1. Bot側プロジェクト

1. スプレッドシートの「拡張機能」→「Apps Script」を開く
2. プロジェクト名を `e-colleague` に変更
3. `gas/` ディレクトリ内の全 `.gs` ファイルをコピーしてGASエディタに貼り付け

### 2-2. スクリプトプロパティの設定

「プロジェクトの設定」→「スクリプトプロパティ」に以下を追加。

| プロパティ | 値 |
|-----------|-----|
| `LINE_CHANNEL_TOKEN` | LINE Developersで取得したチャネルアクセストークン |
| `LINE_CHANNEL_SECRET` | LINE Developersで取得したチャネルシークレット |
| `GEMINI_API_KEY` | Google AI Studioで取得したAPIキー |
| `SPREADSHEET_ID` | 作成したスプレッドシートのID（URLの `/d/.../edit` の部分） |
| `ENCRYPTION_KEY` | 任意の32文字以上のランダム文字列 |

### 2-3. ライブラリの追加

「ライブラリ」→「ライブラリを追加」に以下を入力。

| ライブラリ | スクリプトID |
|-----------|-------------|
| cCryptoGS | `1IEkpeS8hsMSVLRdCMprij996zG6ek9UvGwcCJao_hlDMlgbWWvJpONrs` |

### 2-4. OAuthスコープの設定

「プロジェクトの設定」→「appsscript.json マニフェストファイルをエディタで表示する」をオンにして、以下を追加。

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

### 2-5. デプロイ

1. 「デプロイ」→「新しいデプロイ」
2. 種類: 「ウェブアプリ」、アクセス権: 「全員」
3. デプロイ後、発行されたURLを控える

---

## Step 3: LINEチャネルの設定

### 3-1. LINE Developersコンソール

1. [LINE Developersコンソール](https://developers.line.biz/ja/) にログイン
2. Messaging APIチャネルを作成
3. 「Messaging API設定」タブで以下を設定
   - Webhook URL: GASのデプロイURL
   - 「Webhookの利用」をオン
   - 「応答メッセージ」をオフ
   - 「あいさつメッセージ」をオフ
   - 「グループ・複数人チャットへの参加を許可する」をオン

---

## Step 4: 管理者ポータルの設定（オプション）

### 4-1. ポータル側GASプロジェクト

1. Googleドライブで新規GASプロジェクトを作成
2. プロジェクト名を `e-colleague Portal` に変更
3. `portal/` ディレクトリ内の全 `.gs` ファイルを貼り付け
4. スクリプトプロパティに以下を設定

| プロパティ | 値 |
|-----------|-----|
| `SPREADSHEET_ID` | Bot側と同じスプレッドシートID |
| `ENCRYPTION_KEY` | Bot側と同じ暗号化キー |

5. cCryptoGSライブラリを追加（Bot側と同じ）
6. デプロイ（ウェブアプリとして）

### 4-2. フロントエンドのホスト

1. `frontend/app.js` の `API_URL` をポータル側GASのデプロイURLに変更
2. `frontend/` ディレクトリをGitHub Pagesまたは任意のWebサーバーにホスト

---

## Step 5: 動作確認

### 5-1. グループ認証

1. BotをLINEグループに招待
2. Configシートに設定したプロダクトキーをグループに送信
3. 「プロダクトキーが認証されました」と返信があれば成功

### 5-2. タスク登録テスト

1. 「スライド作らなきゃ」と発言 → **無反応**（Contextsに保存される）
2. 「明日までに」と発言 → **無反応**（Contextsに保存される）
3. 「俺がやる」と発言 → **Flex Messageが返ってくる**
4. ゴール確認メッセージに回答（または無視） → タスク登録完了

### 5-3. カレンダー確認（オプション）

タスク登録後、指定したGoogleカレンダーに予定が追加されているか確認。

---

## トラブルシューティング

| 症状 | 確認ポイント |
|------|-------------|
| Webhook検証に失敗する | デプロイ設定の「アクセスできるユーザー」が「全員」か |
| Botが返信しない | 実行ログを確認。トリガーが溜まっていないか |
| 「Gemini応答が空」エラー | APIキーが正しいか、モデル名が最新か |
| スプレッドシートにアクセスできない | OAuthスコープと権限承認を再確認 |
| カレンダーに登録されない | カレンダーIDが正しいか、GAS実行者に編集権限があるか |

---

## 関連ドキュメント

- [技術仕様書](technical-spec.md)
- [使い方](user-guide.md)
- [利用規約(外部リンク)](https://shimataiyaki.github.io/e-colleague/docs/terms.html)
- [プライバシーポリシー（外部リンク）](https://shimataiyaki.github.io/e-colleague/privacy.html_)
```
