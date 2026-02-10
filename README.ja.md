# IFC Core MCP Server

[![npm version](https://img.shields.io/npm/v/@shuji-bonji/ifc-core-mcp)](https://www.npmjs.com/package/@shuji-bonji/ifc-core-mcp)
[![CI](https://github.com/shuji-bonji/ifc-core-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/shuji-bonji/ifc-core-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Claude Cowork](https://img.shields.io/badge/Built%20with-Claude%20Cowork-blueviolet?logo=anthropic)](https://claude.com/product/cowork)

[English README](./README.md)

**IFC4.3 仕様リファレンス MCP サーバー** — IFC エンティティ定義・属性・継承関係・PropertySet を検索・参照するための MCP サーバーです。

既存の IFC 関連 MCP サーバーが IFC モデルファイルの**操作**（パース・抽出・変換・編集）を目的としているのに対し、本サーバーは **IFC 仕様そのもの** を構造化されたリファレンスとして提供します。AI が IFC4.3 標準（ISO 16739-1:2024）で定義されたエンティティ・属性・型・制約の**正確な定義**を参照できるインフラです。

## 主な機能

- **エンティティ検索** — 名前や説明文のキーワードで IFC エンティティを検索
- **エンティティ定義取得** — 属性・継承・WHERE 制約・ドキュメントを含む完全な定義を取得
- **継承ツリー** — 祖先チェーンとサブタイプ階層を可視化
- **PropertySet 検索** — PropertySet 定義の取得・キーワード検索
- **デュアル出力** — 全ツールが Markdown（可読形式）と JSON（構造化形式）の両方に対応
- **ページネーション** — 大量の検索結果に対する limit/offset 制御

## 利用可能なツール

| ツール                | 機能                                                     |
| --------------------- | -------------------------------------------------------- |
| `ifc_search_entity`   | エンティティ名・説明文でキーワード検索                   |
| `ifc_get_entity`      | エンティティ定義の取得（属性・継承・WHERE 制約・説明文） |
| `ifc_get_inheritance` | 継承ツリー（ancestors / descendants / both）             |
| `ifc_get_propertyset` | PropertySet 定義の取得・検索                             |

## インストール

### npm（グローバル）

```bash
npm install -g @shuji-bonji/ifc-core-mcp
```

### Claude Desktop

`claude_desktop_config.json` に以下を追加:

```json
{
  "mcpServers": {
    "ifc-core": {
      "command": "npx",
      "args": ["-y", "@shuji-bonji/ifc-core-mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add ifc-core -- npx -y @shuji-bonji/ifc-core-mcp
```

### ソースから

```bash
git clone https://github.com/shuji-bonji/ifc-core-mcp.git
cd ifc-core-mcp
npm install
npm run build
node dist/index.js
```

## データカバレッジ

IFC4.3 スキーマの全体をカバーしています:

| カテゴリ         | 件数 |
| ---------------- | ---- |
| エンティティ     | 876  |
| 型宣言           | 132  |
| 列挙型           | 243  |
| Select 型        | 61   |
| 関数             | 48   |
| グローバルルール | 2    |

エンティティは IFC の4層構造に分類されています:

| 層       | エンティティ数 | 内容                     |
| -------- | -------------- | ------------------------ |
| Resource | 392            | ジオメトリ、単位、材料   |
| Core     | 145            | カーネル、プロダクト拡張 |
| Shared   | 111            | 壁・柱・梁・設備等       |
| Domain   | 228            | 建築・HVAC・鉄道・道路等 |

## アーキテクチャ

```
ビルド時（一度だけ、Python）:
  IFC.exp (EXPRESS スキーマ) → ifc4x3-schema.json
  IFC4.3.x-development Markdown → ifc4x3-descriptions-*.json

ランタイム（TypeScript MCP サーバー）:
  ビルド済み JSON → Map ベースインデックス → MCP ツール
```

サーバーは起動時に3つのビルド済み JSON データファイルを読み込み、インメモリの Map インデックスを構築します（名前による O(1) ルックアップ）。EXPRESS スキーマが構造データ（型・属性・継承・WHERE 制約）を、Markdown ドキュメントが意味データ（定義・使い方・履歴）を提供します。

## データソースとライセンス

- **EXPRESS スキーマ** (`IFC.exp`) — [buildingSMART/IFC4.3.x-output](https://github.com/buildingSMART/IFC4.3.x-output) より
- **Markdown ドキュメント** — [buildingSMART/IFC4.3.x-development](https://github.com/buildingSMART/IFC4.3.x-development) より
- IFC 仕様コンテンツは buildingSMART International による **CC BY-ND 4.0** ライセンスです

## 開発

### 前提条件

- Node.js >= 18
- Python 3 + [IfcOpenShell](https://ifcopenshell.org/)（データ再生成時のみ）

### コマンド

```bash
npm run build          # TypeScript コンパイル
npm run dev            # tsx によるウォッチモード
npm test               # 全テスト実行（unit + e2e）
npm run test:unit      # ユニットテストのみ
npm run test:e2e       # E2E 統合テスト
npm run lint           # ESLint チェック
npm run format         # Prettier フォーマット
npm run prepare-data   # 生データからデータ再生成（Python 必須）
```

### 技術スタック

- **ランタイム**: TypeScript (strict), Node.js
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **バリデーション**: Zod
- **テスト**: Vitest（unit + 実 MCP クライアントによる e2e）
- **リンター**: ESLint + Prettier
- **CI/CD**: GitHub Actions（lint → test → build → publish）

## 関連プロジェクト

- [w3c-mcp](https://github.com/shuji-bonji/w3c-mcp) — W3C/WHATWG/IETF Web 仕様の MCP サーバー
- [rfcxml-mcp](https://github.com/shuji-bonji/rfcxml-mcp) — IETF RFC ドキュメントの MCP サーバー（XML ベース）

## ライセンス

[MIT](./LICENSE)
