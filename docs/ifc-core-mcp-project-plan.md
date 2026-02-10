# ifc-core-mcp 開発計画

## プロジェクト概要

**IFC仕様リファレンス MCP サーバー** の開発。

AIが IFC（Industry Foundation Classes）の仕様を「判断の根拠」として参照するための MCP（Model Context Protocol）サーバーを構築する。

> **既存の IFC 関連 MCP** は、IFCファイル（BIMモデル）の操作（抽出・変換・編集）を目的としている。  
> **本プロジェクト** は、IFC 仕様そのもの（エンティティ定義、属性、継承、PropertySet）を検索・参照するための **仕様リファレンス MCP** であり、既存MCPとは相補的な関係にある。

## 背景と動機

### 既存 IFC MCP（Operational MCP）

| 名前            | 概要                                         |
| --------------- | -------------------------------------------- |
| smartaec/ifcMCP | IFCファイルからエンティティ/プロパティを抽出 |
| Bonsai MCP      | Blender経由でIFCモデルを操作                 |
| openbim-mcp     | IFC → fragment 変換・クエリ                  |
| MCP4IFC         | RAGベースの学術フレームワーク                |

これらは全て「IFCファイルを操作する」MCPであり、「IFC仕様を参照する」MCPは **存在しない**。

### Specification Reference MCP の必要性

```
既存MCP（Operational）:
  IFC file → parse → extract/modify data
  「このモデルの IfcWall を一覧表示して」

本MCP（Reference）:
  IFC specification → search → return definitions
  「IfcWall の IFC4.3 仕様での必須属性は？」
```

AI が IFC モデルを検証・生成・判断する際に、仕様の **正確な定義** を参照できるインフラとなる。

## IFC のバージョンと対象範囲

### バージョン履歴

```
IFC 1.0 (1997) → IFC 2x3 (2006) → IFC4 (2013) → IFC4.3 (2024)
                   ↑ 長年の業界標準        ↑ ISO 16739-1:2024
```

- IFC は「差分」ではなく「累積的スーパーセット」
- IFC4.3 は単体で完全な仕様（過去バージョンの差分情報も説明文に含まれる）
- **対象: IFC4.3 のみ**（過去バージョン対応は将来課題）

### IFC4.3 の4層構造

| 層                              | 内容                           | MCP対応                           |
| ------------------------------- | ------------------------------ | --------------------------------- |
| **Resource Layer (Ch.8)**       | ジオメトリ、単位、材料         | 既存ライブラリ（web-ifc等）の役割 |
| **Core Layer (Ch.5)**           | IfcKernel, IfcProductExtension | ✅ Phase 0 で構築                 |
| **Shared Element Layer (Ch.6)** | 壁・柱・梁・設備等             | Phase 1                           |
| **Domain Layer (Ch.7)**         | 建築・HVAC・鉄道・道路等       | Phase 2                           |

## データソース

IFC4.3 の仕様データは3つのソースから取得可能。**中身は異なる。**

### ① EXPRESS スキーマ（.exp）

- **場所**: `buildingSMART/IFC4.3.x-output` リポジトリ
- **内容**: エンティティの型定義、属性名、型、継承関係、WHERE制約
- **特徴**: 機械可読。説明文なし。
- **用途**: 構造データ化の基盤

```express
ENTITY IfcWall
  SUPERTYPE OF (ONEOF (IfcWallStandardCase))
  SUBTYPE OF (IfcBuiltElement);
    PredefinedType : OPTIONAL IfcWallTypeEnum;
  WHERE
    CorrectPredefinedType : NOT(EXISTS(PredefinedType)) OR ...;
END_ENTITY;
```

### ② GitHub Markdown

- **場所**: `buildingSMART/IFC4.3.x-development` リポジトリ `docs/schemas/` 配下
- **内容**: エンティティの説明文、使い方、変更履歴（IFC4 CHANGE...）
- **特徴**: AIが「意味」を理解するために必須
- **用途**: 説明・コンテキストの提供

### ③ HTML サイト

- **場所**: `ifc43-docs.standards.buildingsmart.org`
- **内容**: ①②の統合 + 継承ツリー図 + PropertySet一覧
- **特徴**: 全部入りだがHTMLパースが複雑
- **用途**: 参考（直接のデータソースとしては使わない）

### 採用方針

```
EXPRESS (.exp)     → 構造データ（型定義・継承・制約）
GitHub Markdown    → 説明データ（意味・使い方・履歴）
PropertySet MD/XML → プロパティ定義データ
```

## EXPRESSパーサーの選択

### 調査結果

TypeScript/JavaScript で .exp スキーマをパースできる成熟パッケージは **存在しない**。

| パッケージ                | 言語       | 状態                                    |
| ------------------------- | ---------- | --------------------------------------- |
| ifc-syntax-express-parser | TS         | npm未公開、文法リバースエンジニアリング |
| IFC-gen (hypar-io)        | C#         | ANTLR文法あり、参考になる               |
| IfcOpenShell              | Python/C++ | 業界標準、成熟                          |
| web-ifc                   | C++/WASM   | .ifc パースのみ（.exp 非対応）          |

### 決定: Option B（ビルド済みデータ方式）

Python + IfcOpenShell を **ビルド時に1回だけ** 使い、.exp → JSON に変換する。  
MCP サーバー本体は **ピュア TypeScript** で JSON を読むだけ。

```
ビルド時（1回だけ）:
  Python + IfcOpenShell → .exp → schema.json

ランタイム:
  TypeScript MCP サーバー → schema.json + Markdown を読む
```

> **フォールバック**: JSON の情報量に不満がある場合は Option A（TypeScript で EXPRESS パーサー自作）に切り替え。

## 開発フロー（確定）

### Step 1: EXPRESS スキーマを取得

`buildingSMART/IFC4.3.x-output` リポジトリから `.exp` ファイルをダウンロード。

### Step 2: Python で .exp → JSON 変換

Python + IfcOpenShell を使い、以下を構造化JSONとして出力:

- エンティティ名
- 属性（名前、型、OPTIONAL か否か）
- 継承関係（SUPERTYPE / SUBTYPE）
- WHERE 制約
- TYPE 定義（Enum、Select 等）

### Step 3: GitHub Markdown 説明文の取得・マッピング

`IFC4.3.x-development/docs/schemas/` 配下の Markdown ファイルを取得し、エンティティ名で紐付け。

### Step 4: MCP サーバー骨格（TypeScript）

JSON + Markdown を読んで検索・返却する最小構成のツールを実装。

**最初のゴール**: `ifc_get_entity("IfcWall")` で定義 + 説明が返る。

### 最小ツール構成（初期）

```typescript
tools: [
	'ifc_search_entity', // エンティティ名で検索
	'ifc_get_entity', // エンティティ定義の取得（属性、継承）
	'ifc_get_inheritance', // 継承ツリー
	'ifc_get_propertyset', // PropertySet定義
];
```

## 技術スタック

| 項目               | 技術                                |
| ------------------ | ----------------------------------- |
| MCP サーバー       | TypeScript                          |
| ビルドツール       | Python + IfcOpenShell（前処理のみ） |
| データ形式         | JSON（構造）+ Markdown（説明）      |
| パッケージ名       | `@shuji-bonji/ifc-core-mcp`（候補） |
| ライセンス         | MIT（予定）                         |
| IFC 仕様ライセンス | CC BY-ND 4.0                        |

## 将来の展望

### Phase 0（今回）: Core Layer MCP

- IFC4.3 Core Layer（Chapter 5）のエンティティ定義を参照可能にする
- 最小限のツールで動作確認

### Phase 1: Shared Element Layer

- ifc-core-mcp 自体を使って AI と共に開発（MCP building MCP）
- 壁・柱・梁・設備等の Shared Layer エンティティを追加

### Phase 2: Domain Layer

- 建築・HVAC・鉄道・道路等のドメイン固有エンティティ
- Core + Shared MCP を活用して効率的に構築

### 関連MCP（別トラック）

- **ifc-ops-mcp**: web-ifc を活用した IFC ファイル操作 MCP
- **S1000D MCP**: 防衛・航空宇宙の技術文書標準（完全グリーンフィールド）

## 参考リンク

- [IFC4.3.x-development (GitHub)](https://github.com/buildingSMART/IFC4.3.x-development)
- [IFC4.3.x-output (GitHub)](https://github.com/buildingSMART/IFC4.3.x-output)
- [IFC 4.3.2 Documentation (HTML)](https://ifc43-docs.standards.buildingsmart.org/)
- [buildingSMART Technical](https://technical.buildingsmart.org/standards/ifc/ifc-schema-specifications/)
- [IfcOpenShell](https://ifcopenshell.org/)
- [web-ifc (npm)](https://www.npmjs.com/package/web-ifc)
