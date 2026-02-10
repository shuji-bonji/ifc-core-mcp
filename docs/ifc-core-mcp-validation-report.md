# ifc-core-mcp 検証レポート

**検証日**: 2025-02-11  
**対象**: `@shuji-bonji/ifc-core-mcp`（GitHub + npm 公開済み）  
**検証方法**: 4ツール全てをMCP経由で実行し、公式IFC4.3仕様と照合

## 総合評価

| 項目                         | 評価                              |
| ---------------------------- | --------------------------------- |
| **エンティティ定義の正確性** | ◎ 公式仕様と完全一致              |
| **継承ツリーの正確性**       | ◎ 完全に正しい                    |
| **エラーハンドリング**       | ◎ 適切なメッセージ                |
| **検索機能**                 | △ 名前一致の優先順位に課題        |
| **PropertySet定義**          | △ プロパティ一覧が不完全          |
| **リポジトリ品質**           | ◎ CI/CD, テスト, ドキュメント完備 |

## ツール別検証結果

### 1. `ifc_search_entity` — △ 動作するが改善余地あり

**テスト**: `query: "Wall"` で検索

**結果**: 15件ヒット。ただし `IfcWall` が **12番目** に出現。

上位に来たのは `IfcBuildingElementPart`、`IfcCurtainWall`、`IfcDoor` など、
説明文中に "wall" を含むエンティティ。

**問題**: 名前の完全一致・前方一致が説明文マッチより優先されていない。

**期待される動作**:

```
1. IfcWall          ← 名前完全一致
2. IfcWallType      ← 名前前方一致
3. IfcWallStandardCase ← 名前前方一致
4. IfcCurtainWall   ← 名前部分一致
5. ...              ← 説明文一致
```

**改善案**: スコアリングロジックの導入

```
名前完全一致(case-insensitive)  → score: 100
名前前方一致("IfcWall...")      → score: 80
名前部分一致("...Wall...")      → score: 60
説明文一致                      → score: 20
```

### 2. `ifc_get_entity` — ◎ 正確

**テスト**: `IfcWall`（通常エンティティ）、`IfcRoot`（抽象・最上位）、`IfcFooBar`（存在しない）

#### IfcWall — 公式仕様との照合

| 項目                        | 公式仕様 (ISO 16739-1:2024)               | MCP返却値                                               | 一致 |
| --------------------------- | ----------------------------------------- | ------------------------------------------------------- | ---- |
| SUPERTYPE                   | IfcBuiltElement                           | `"supertype": "IfcBuiltElement"`                        | ✅   |
| SUBTYPE                     | IfcWallStandardCase                       | `"subtypes": ["IfcWallStandardCase"]`                   | ✅   |
| 固有属性                    | PredefinedType : OPTIONAL IfcWallTypeEnum | `kind: "enum", name: "IfcWallTypeEnum", optional: true` | ✅   |
| WHERE CorrectPredefinedType | あり                                      | あり（式も一致）                                        | ✅   |
| WHERE CorrectTypeAssigned   | あり                                      | あり                                                    | ✅   |
| 継承属性数(allAttributes)   | 9個 (GlobalId〜PredefinedType)            | 9個返却                                                 | ✅   |
| 説明文                      | Markdown形式                              | 詳細な説明、使い方、図の参照含む                        | ✅   |
| isAbstract                  | false                                     | `"isAbstract": false`                                   | ✅   |
| layer/schema                | shared / IfcSharedBldgElements            | 一致                                                    | ✅   |

#### IfcRoot — 抽象エンティティ

| 項目                  | 結果                                                  |
| --------------------- | ----------------------------------------------------- |
| isAbstract            | `true` ✅                                             |
| supertype             | `null` ✅（最上位）                                   |
| subtypes              | ObjectDefinition, PropertyDefinition, Relationship ✅ |
| 固有属性              | GlobalId, OwnerHistory, Name, Description（4個） ✅   |
| OwnerHistory optional | `true` ✅（IFC4で変更された通り）                     |

#### IfcFooBar — エラーハンドリング

```
Error: Entity 'IfcFooBar' not found in IFC4.3 schema.
Use ifc_search_entity to find available entities.
```

適切なエラーメッセージで、次のアクションも案内している。 ✅

#### include_inverse テスト

`IfcWall` で `include_inverse: true` → 26個の逆関係属性が返却。
`HasOpenings`、`FillsVoids`、`ContainedInStructure` など、
壁の主要な関係性が全て含まれている。 ✅

### 3. `ifc_get_inheritance` — ◎ 正確

**テスト1**: `IfcWall`, direction: "both"

```
Ancestors: IfcWall → IfcBuiltElement → IfcElement → IfcProduct
           → IfcObject → IfcObjectDefinition → IfcRoot
```

公式仕様と完全一致。 ✅

**テスト2**: `IfcElement`, direction: "descendants", depth: 2

- IfcBuiltElement 配下に30種の建築要素（IfcWall, IfcBeam, IfcColumn...）
- IfcDistributionElement 配下に ControlElement / FlowElement
- IfcFeatureElement 配下に Addition / Subtraction / SurfaceFeature
- 抽象エンティティに `_(abstract)_` マーク付き

公式のAnnex C継承リストと照合して正確。 ✅

### 4. `ifc_get_propertyset` — △ 構造は正しいがプロパティ詳細が欠落

#### GET モード: `Pset_WallCommon`

**返却されたもの**:

- name ✅
- layer / schema ✅
- shortDefinition ✅

**返却されなかったもの**:

- **個別プロパティの一覧**（Reference, IsExternal, LoadBearing, ThermalTransmittance 等）
- プロパティの型情報（IfcBoolean, IfcThermalTransmittanceMeasure 等）
- プロパティの説明文

**公式仕様の Pset_WallCommon には以下が定義されている**:

| Property             | Type                           | 説明                     |
| -------------------- | ------------------------------ | ------------------------ |
| Reference            | IfcIdentifier                  | 参照ID                   |
| Status               | IfcLabel                       | 状態（新規/既存/解体等） |
| AcousticRating       | IfcLabel                       | 遮音等級                 |
| FireRating           | IfcLabel                       | 耐火等級                 |
| Combustible          | IfcBoolean                     | 可燃性                   |
| SurfaceSpreadOfFlame | IfcLabel                       | 火炎伝播                 |
| ThermalTransmittance | IfcThermalTransmittanceMeasure | 熱貫流率                 |
| IsExternal           | IfcBoolean                     | 外壁か                   |
| LoadBearing          | IfcBoolean                     | 耐荷重か                 |
| ExtendToStructure    | IfcBoolean                     | 構造体まで延長するか     |

これらが返却されないのは、PropertySetの **データソースにプロパティ定義が含まれていない** ことが原因と推測される。

**改善案**: PropertySet XML/YAML データ（`IFC4.3.x-development/reference_schemas/psd/` 配下）をビルド時に取り込み、プロパティ一覧を構造化データに含める。

#### SEARCH モード: `thermal`

15件の関連PropertySetが返却。キーワード検索は正常に動作。 ✅

## WHERE ルール式の軽微な差異

MCP が返す WHERE CorrectTypeAssigned:

```
'IFC4X3_DEV_923b0514.IFCWALLTYPE'
```

公式仕様:

```
'IFC4X3_ADD2.IFCWALLTYPE'
```

これは IfcOpenShell が開発版スキーマ（`_DEV_923b0514`）から生成したIDで、
**ロジック自体は同一**。`TYPEOF` で型チェックするだけなので実用上問題なし。
ただし、正式リリース版との一致を求める場合は文字列置換が望ましい。

## 改善提案（優先度順）

### 🔴 High: PropertySet プロパティ一覧の追加

現状 PropertySet は「説明文のみ」で、個別プロパティ（名前・型・説明）が返らない。
BIM 実務で最も参照頻度が高いデータなので、優先的に対応すべき。

**データソース候補**:

- `IFC4.3.x-development/reference_schemas/psd/` 内の XML/YAML
- buildingSMART の PSD (Property Set Definition) ファイル

### 🟡 Medium: 検索ランキングの改善

名前一致を優先するスコアリングを導入。
ユーザーが「Wall」で検索して IfcWall が1番目に来ないのは UX として厳しい。

### 🟢 Low: WHERE ルール内のスキーマID正規化

`IFC4X3_DEV_*` → `IFC4X3_ADD2` への文字列置換。
表示上の問題のみで、機能への影響はない。

## リポジトリ品質

| 項目                               | 状態                           |
| ---------------------------------- | ------------------------------ |
| README（EN/JA）                    | ✅ 両言語完備                  |
| LICENSE (MIT)                      | ✅                             |
| CI (GitHub Actions)                | ✅ バッジ付き                  |
| テスト (vitest)                    | ✅                             |
| ESLint + Prettier                  | ✅                             |
| CHANGELOG                          | ✅                             |
| npm 公開                           | ✅ `@shuji-bonji/ifc-core-mcp` |
| 日本語README                       | ✅ README.ja.md                |
| 「Built with Claude Cowork」バッジ | ✅ 😄                          |

## 結論

**コアの仕様データ（エンティティ定義・属性・継承・WHERE制約）は公式IFC4.3仕様と正確に一致しており、信頼できる。** 「IFC仕様リファレンスMCP」としての基本機能は十分に動作している。

主な改善ポイントは2つ:

1. **PropertySet のプロパティ一覧**を追加すれば、実務利用に耐えるレベルになる
2. **検索ランキング**を改善すれば、UXが大幅に向上する

どちらもデータ層の改善であり、MCP サーバーのアーキテクチャ自体は堅実。
