# e-colleague

LINEグループ上で動作するチーム向けタスク管理AIアシスタント。自然な会話をコンテキストとして蓄積し、「やる」「お願い」などのキーワードをトリガーにAIがタスクを自動抽出・記録します。

## コンセプト

**「発言が、タスクになる。」**

## 技術スタック

| コンポーネント | 技術 |
|---------------|------|
| Bot基盤 | LINE Messaging API |
| バックエンド | Google Apps Script (GAS) |
| AI | Gemini 3.1 Flash Lite |
| データベース | Google スプレッドシート（AES-256暗号化） |
| カレンダー | Google Calendar API |
| 管理者ポータル | HTML/CSS/JS + GAS Web App |

## リポジトリ構成
├── gas/ # Bot本体（GASコード）
├── portal/ # 管理者ポータルAPI（GASコード）
├── frontend/ # 管理者ポータルUI（HTML/CSS/JS）
└── docs/ # 技術仕様書

text

## セットアップ

1. Googleスプレッドシートを作成し、各シートを設定
2. GASプロジェクトを2つ作成（Bot用・ポータル用）
3. スクリプトプロパティにAPIキー等を設定
4. cCryptoGSライブラリを追加
5. LINE Developersでチャネルを作成しWebhook URLを設定

詳細は `docs/technical-spec.md` を参照してください。

## ライセンス

MIT License

## プロジェクトサイト

[https://shimataiyaki.github.io/e-colleague/](https://shimataiyaki.github.io/e-colleague/)

## 開発者

Shimataiyaki
