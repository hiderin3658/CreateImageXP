# CreateImageXP

AWS BedrockのNova Canvasモデルを使用したクロスプラットフォーム画像生成アプリケーション

## 機能概要

- テキストプロンプトを使用してNova Canvasモデルで画像を生成
- 以下の生成パラメータを調整可能：
  - プロンプト
  - スタイルプリセット（photographic、digital-art、cinematic、pixel-artなど）
  - 画像サイズ
  - プロンプト忠実度（CFG Scale）
  - ステップ数
  - シード値
- 生成された画像の表示
- 画像の保存とギャラリー機能
- スタイルプリセットによる画像スタイルの制御
- 多言語プロンプト対応（日本語→英語自動翻訳）

## クロスプラットフォーム対応

このアプリケーションはReact NativeとExpoを使用して開発されており、以下のプラットフォームで動作します：
- iOS
- Android
- ウェブ（一部機能制限あり）

## システム要件

- Node.js 16以降
- npm または yarn
- AWS アカウント
- AWS Bedrock Nova Canvasモデルへのアクセス権
- iOS/Androidでの実行時はExpo GoアプリまたはEASビルド

## システム構成

このアプリケーションは以下のコンポーネントで構成されています：

1. **React Native/Expoクライアントアプリ**：
   - React NativeとExpoで実装されたクロスプラットフォームUI
   - AWS認証情報の管理
   - AWSサービスとの通信

2. **AWSサービス**：
   - **Amazon Cognito**: 認証管理（未認証アクセス）
   - **AWS Bedrock**: Nova Canvasモデルによる画像生成
   - **AWS Lambda**: 画像生成リクエストの処理
   - **Amazon API Gateway**: Lambda関数へのAPIエンドポイント提供
   - **Amazon Translate**: 日本語プロンプトの英語翻訳（Lambda内）

## フォルダ構成

```
ImageGeneratorApp/
├── src/
│   ├── screens/                # 画面コンポーネント
│   │   ├── HomeScreen.js       # メイン画面
│   │   ├── GalleryScreen.js    # ギャラリー画面
│   │   └── SettingsScreen.js   # 設定画面
│   ├── components/             # 再利用可能なUIコンポーネント
│   ├── api/                    # API通信
│   │   ├── bedrockService.js   # Bedrock API連携
│   │   └── aws.js              # AWS共通関数
│   ├── context/                # React Context
│   │   └── AWSContext.js       # AWS認証情報コンテキスト
│   ├── config/                 # 設定
│   │   └── aws-config.js       # AWS設定情報
│   ├── hooks/                  # カスタムフック
│   └── utils/                  # ユーティリティ関数
├── lambda_deployment/          # Lambda関数デプロイ用ファイル
│   └── lambda_function.py      # 画像生成Lambda関数
├── App.js                      # アプリケーションのエントリーポイント
├── package.json                # 依存関係
├── babel.config.js             # Babelの設定
├── app.json                    # Expoの設定
└── AWS_Setting.md              # AWS設定の詳細ガイド
```

## セットアップ手順

1. **リポジトリをクローン：**
   ```bash
   git clone <repository-url>
   cd ImageGeneratorApp
   ```

2. **依存関係のインストール：**
   ```bash
   npm install
   # または
   yarn install
   ```

3. **AWS設定：**
   - `src/config/aws-config.js`ファイルを作成し、必要なAWS設定を追加（詳細は`AWS_Setting.md`参照）
   - 以下の情報を含める：
     - Cognito Identity Pool ID
     - リージョン情報
     - API Gatewayエンドポイント

4. **Lambda関数のデプロイ：**
   - `lambda_deployment/`ディレクトリ内のLambda関数をAWSにデプロイ
   - 必要な環境変数（`BEDROCK_MODEL_ID`、`BEDROCK_REGION`）を設定
   - API Gatewayと連携するように設定

5. **アプリの実行（開発環境）：**
   ```bash
   # Expo開発サーバーを起動
   npx expo start
   ```
   
   上記コマンド実行後、以下の方法で各プラットフォームでアプリを実行できます：
   - iOSシミュレータ: `i`キーを押す
   - Androidエミュレータ: `a`キーを押す
   - ウェブブラウザ: `w`キーを押す
   - 実機: Expo Goアプリで表示されるQRコードをスキャン

6. **本番環境ビルド（オプション）：**
   ```bash
   # EAS Buildを使用してネイティブバイナリを作成
   npx eas build --platform ios
   npx eas build --platform android
   ```

## 使用方法

1. アプリを起動し、AWS設定が正しく行われていることを確認
2. ホーム画面でプロンプトを入力し、必要に応じてパラメータを調整
3. 「Generate」ボタンをタップして画像を生成
4. 生成された画像を保存またはシェア
5. ギャラリー画面で過去に生成した画像を閲覧

## プラットフォーム別の注意点

### iOS
- 写真ライブラリへのアクセス権限が必要（初回アクセス時にシステムが自動的に要求）
- iOS 14以降を推奨

### Android
- 外部ストレージへのアクセス権限が必要
- Android 8.0（API レベル26）以降を推奨

### Web
- 画像保存機能はブラウザのダウンロード機能を使用
- 一部のブラウザでは写真ライブラリとの統合が制限される場合あり

## Lambda関数の仕様

Lambda関数(`lambda_function.py`)は以下の処理を行います：

1. リクエストからプロンプトなどのパラメータを取得
2. 必要に応じてプロンプトを日本語から英語に翻訳
3. スタイルプリセットに基づいてプロンプトを強化
4. AWS Bedrock Nova Canvasモデルで画像を生成
5. 生成された画像とメタデータをレスポンスとして返却

## アーキテクチャ

- **React Native + Expo**: クロスプラットフォームユーザーインターフェース
- **React Context**: アプリケーション状態管理
- **AWS Amplify**: AWS認証と通信
- **カスタムフック**: 画像生成ロジックの分離と再利用

## ライセンス

0BSD License

