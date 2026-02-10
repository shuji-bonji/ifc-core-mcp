/**
 * MCP レスポンス生成ユーティリティ
 *
 * 各ツールで繰り返されるレスポンス生成パターンを共通化する。
 */

import { CHARACTER_LIMIT, TRUNCATION_SUFFIX } from "../constants.js";

// ── 型定義 ──────────────────────────────────────────

/** MCP ツールレスポンスのコンテンツ要素 */
interface TextContent {
  type: "text";
  text: string;
}

/**
 * MCP ツールレスポンス。
 * SDK が要求するインデックスシグネチャを含む。
 */
export interface ToolResponse {
  [key: string]: unknown;
  content: TextContent[];
  isError?: boolean;
}

// ── テキスト切り詰め ────────────────────────────────

/**
 * テキストが CHARACTER_LIMIT を超える場合に切り詰める。
 * 超えない場合はそのまま返す。
 */
export function truncateText(text: string, limit: number = CHARACTER_LIMIT): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit) + TRUNCATION_SUFFIX;
}

// ── レスポンス生成 ──────────────────────────────────

/**
 * テキストレスポンスを生成する（自動で切り詰め付き）。
 */
export function createTextResponse(text: string): ToolResponse {
  return {
    content: [{ type: "text" as const, text: truncateText(text) }],
  };
}

/**
 * JSON レスポンスを生成する（自動でシリアライズ + 切り詰め付き）。
 */
export function createJsonResponse(data: unknown): ToolResponse {
  const text = JSON.stringify(data, null, 2);
  return createTextResponse(text);
}

/**
 * エラーレスポンスを生成する。
 */
export function createErrorResponse(message: string): ToolResponse {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

/**
 * エンティティが見つからない場合のエラーレスポンスを生成する。
 */
export function createNotFoundError(kind: string, name: string, hint?: string): ToolResponse {
  const hintText = hint ? ` ${hint}` : "";
  return createErrorResponse(`Error: ${kind} '${name}' not found in IFC4.3 schema.${hintText}`);
}
