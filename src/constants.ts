/**
 * IFC Core MCP Server - Constants
 *
 * ハードコーディングを避け、設定値を一元管理する。
 */

// ── サーバー情報 ─────────────────────────────────────

/** サーバー名 */
export const SERVER_NAME = "ifc-core-mcp-server";

/** サーバーバージョン */
export const SERVER_VERSION = "0.1.1";

// ── レスポンス制御 ───────────────────────────────────

/** レスポンスの最大文字数 */
export const CHARACTER_LIMIT = 25000;

/** 文字数超過時の切り詰めメッセージ */
export const TRUNCATION_SUFFIX = "\n\n...[truncated]";

// ── ページネーション ─────────────────────────────────

/** デフォルトの取得件数 */
export const DEFAULT_LIMIT = 20;

/** 最大取得件数 */
export const MAX_LIMIT = 100;

// ── データパス ───────────────────────────────────────

/** 生成データのディレクトリ名（dist/ からの相対） */
export const DATA_DIR_RELATIVE = "../../data/generated";

/** スキーマ JSON ファイル名 */
export const SCHEMA_FILE = "ifc4x3-schema.json";

/** 説明文インデックス JSON ファイル名 */
export const DESC_INDEX_FILE = "ifc4x3-descriptions-index.json";

/** 説明文フルテキスト JSON ファイル名 */
export const DESC_FULL_FILE = "ifc4x3-descriptions-full.json";

/** PropertySet プロパティ定義 JSON ファイル名 */
export const PSET_DEFS_FILE = "ifc4x3-propertyset-defs.json";

// ── スキーマID正規化 ────────────────────────────────

/**
 * 開発版スキーマ ID のパターン。
 * IfcOpenShell が生成する WHERE ルールに含まれる開発版識別子。
 * 例: 'IFC4X3_DEV_923b0514.IFCWALLTYPE'
 */
export const SCHEMA_ID_DEV_PATTERN = /IFC4X3_DEV_[a-f0-9]+/g;

/**
 * 正式リリース版のスキーマ ID。
 * IFC4.3 ADD2 (ISO 16739-1:2024) に対応。
 */
export const SCHEMA_ID_RELEASE = "IFC4X3_ADD2";

// ── エンティティ表示設定 ─────────────────────────────

/** get-entity で表示するドキュメントセクション名 */
export const ENTITY_DOC_SECTIONS = ["Attributes", "Formal Propositions", "Concepts"] as const;
