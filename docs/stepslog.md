## Step 1

### 取得したファイル

| ファイル            | サイズ           | 内容                   |
| ------------------- | ---------------- | ---------------------- |
| `data/raw/IFC.exp`  | 398KB (13,984行) | EXPRESS スキーマ本体   |
| `data/raw/IFC.json` | 56MB             | bSDD形式の構造化データ |

### IFC.exp の統計

| 要素         | 件数 |
| ------------ | ---- |
| **ENTITY**   | 876  |
| **TYPE**     | 436  |
| **FUNCTION** | 48   |
| **RULE**     | 2    |

### IFC.exp のサンプル（IfcWall）

```express
ENTITY IfcWall
 SUPERTYPE OF (ONEOF (IfcWallStandardCase))
 SUBTYPE OF (IfcBuiltElement);
    PredefinedType : OPTIONAL IfcWallTypeEnum;
 WHERE
    CorrectPredefinedType : NOT(EXISTS(PredefinedType)) OR ...;
    CorrectTypeAssigned : (SIZEOF(IsTypedBy) = 0) OR ...;
END_ENTITY;
```

### 重要な発見：IFC.json（bSDD形式）

リポジトリに `IFC.json` が既に存在していました。1418 Classes + 2501 Properties を含みますが、**EXPRESS の情報（属性の型、継承関係、WHERE制約）は含まれていません**。PropertySet との紐付け情報が豊富なので、Step 2 の補助データとして活用できます。

---

## Step 2

### 生成ファイル

`data/generated/ifc4x3-schema.json`（3.6 MB）

### 統計

| カテゴリ              | 件数 |
| --------------------- | ---- |
| **Entities**          | 876  |
| **Type Declarations** | 132  |
| **Enumerations**      | 243  |
| **Select Types**      | 61   |
| **Functions**         | 48   |
| **Global Rules**      | 2    |

### IfcWall の出力例（抜粋）

各エンティティに以下の情報が含まれています：

| フィールド          | 内容                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| `name`              | `"IfcWall"`                                                                                      |
| `isAbstract`        | `false`                                                                                          |
| `supertype`         | `"IfcBuiltElement"`                                                                              |
| `subtypes`          | `["IfcWallStandardCase"]`                                                                        |
| `ancestors`         | `["IfcBuiltElement", "IfcElement", "IfcProduct", "IfcObject", "IfcObjectDefinition", "IfcRoot"]` |
| `directAttributes`  | 1件（PredefinedType）                                                                            |
| `allAttributes`     | 9件（継承含む）                                                                                  |
| `inverseAttributes` | 26件                                                                                             |
| `whereRules`        | 2件（CorrectPredefinedType, CorrectTypeAssigned）                                                |

### 現在のファイル構成

```
ifc-core-mcp/
├── data/
│   ├── raw/
│   │   ├── IFC.exp          (398 KB)
│   │   └── IFC.json         (56 MB - bSDD形式、参考用)
│   └── generated/
│       └── ifc4x3-schema.json  (3.6 MB) ← Step 2 の成果物
└── scripts/
    └── convert_express_to_json.py
```

---

## Step 3

### 生成ファイル

| ファイル                         | サイズ | 用途                                 |
| -------------------------------- | ------ | ------------------------------------ |
| `ifc4x3-descriptions-index.json` | 1.4 MB | 軽量インデックス（検索・一覧表示用） |
| `ifc4x3-descriptions-full.json`  | 5.2 MB | 全文データ（Markdown本文含む）       |

### マッピング精度

| カテゴリ     | Schema JSON | Markdown | 一致率   |
| ------------ | ----------- | -------- | -------- |
| **Entities** | 876         | 876      | **100%** |
| **Types**    | 436         | 436      | **100%** |

### 層別エンティティ数

| Layer        | エンティティ数 | Phase                |
| ------------ | -------------- | -------------------- |
| **core**     | 145            | Phase 0（今回）      |
| **shared**   | 111            | Phase 1              |
| **domain**   | 228            | Phase 2              |
| **resource** | 392            | 既存ライブラリの領域 |

### 各エントリに含まれる情報

```json
{
  "name": "IfcWall",
  "layer": "shared",
  "schema": "IfcSharedBldgElements",
  "category": "Entities",
  "shortDefinition": "The wall represents a vertical construction...",
  "history": ["HISTORY New entity in IFC1.0", ...],
  "markdownPath": "docs/schemas/shared/IfcSharedBldgElements/Entities/IfcWall.md"
}
```

### 現在のファイル構成

```
ifc-core-mcp/
├── data/
│   ├── raw/
│   │   ├── IFC.exp              (398 KB)
│   │   └── IFC.json             (56 MB)
│   └── generated/
│       ├── ifc4x3-schema.json            (3.7 MB) ← Step 2
│       ├── ifc4x3-descriptions-index.json (1.4 MB) ← Step 3
│       └── ifc4x3-descriptions-full.json  (5.2 MB) ← Step 3
└── scripts/
    ├── convert_express_to_json.py
    └── build_markdown_index.py
```

---

## Step 4

### 最終ファイル構成

```
ifc-core-mcp/
├── package.json              # @shuji-bonji/ifc-core-mcp
├── tsconfig.json
├── data/
│   ├── raw/
│   │   ├── IFC.exp           (398 KB)  ← Step 1
│   │   └── IFC.json          (56 MB)   ← Step 1
│   └── generated/
│       ├── ifc4x3-schema.json          (3.7 MB)  ← Step 2
│       ├── ifc4x3-descriptions-index.json (1.4 MB) ← Step 3
│       └── ifc4x3-descriptions-full.json  (5.2 MB) ← Step 3
├── scripts/
│   ├── convert_express_to_json.py      ← Step 2
│   └── build_markdown_index.py         ← Step 3
├── src/                                ← Step 4
│   ├── index.ts              # エントリーポイント
│   ├── types.ts              # 型定義
│   ├── constants.ts          # 定数
│   ├── services/
│   │   └── schema-loader.ts  # データロード・検索インデックス
│   └── tools/
│       ├── search-entity.ts  # ifc_search_entity
│       ├── get-entity.ts     # ifc_get_entity
│       ├── get-inheritance.ts # ifc_get_inheritance
│       └── get-propertyset.ts # ifc_get_propertyset
└── dist/                     # ビルド済み JS
```

### 実装済みツール

| ツール                | 機能                                              | テスト結果 |
| --------------------- | ------------------------------------------------- | ---------- |
| `ifc_search_entity`   | エンティティ名・説明文でキーワード検索            | ✅         |
| `ifc_get_entity`      | エンティティ定義（属性・継承・WHERE制約・説明文） | ✅         |
| `ifc_get_inheritance` | 継承ツリー（ancestors / descendants）             | ✅         |
| `ifc_get_propertyset` | PropertySet 定義の取得・検索                      | ✅         |

### 最初のゴール達成

`ifc_get_entity("IfcWall")` で以下が返ります：

- 短い定義文（"The wall represents a vertical construction..."）
- 継承チェーン（IfcWall → IfcBuiltElement → ... → IfcRoot）
- 全属性（9件、直接 + 継承）
- WHERE制約（CorrectPredefinedType, CorrectTypeAssigned）
- 詳細ドキュメント（Concepts, Formal Propositions 等）

### 使い方

```bash
# ビルド
npm run build

# 起動（stdio transport）
node dist/index.js
```

Claude Desktop の `claude_desktop_config.json` に追加する場合：

```json
{
	"mcpServers": {
		"ifc-core": {
			"command": "node",
			"args": ["/path/to/ifc-core-mcp/dist/index.js"]
		}
	}
}
```
