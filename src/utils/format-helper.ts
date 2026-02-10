/**
 * フォーマットユーティリティ
 *
 * 型参照や属性のフォーマットなど、複数ツールで使われる表示ロジック。
 */

import type { DirectAttribute, TypeRef } from "../types.js";

/**
 * TypeRef を人間が読める文字列に変換する。
 *
 * EXPRESS スキーマの型表現をそのまま再現する。
 */
export function typeRefToString(typeRef: TypeRef): string {
  switch (typeRef.kind) {
    case "entity":
    case "type":
    case "enum":
    case "select":
    case "named":
      return typeRef.name;
    case "simple":
      return typeRef.name.toUpperCase();
    case "aggregation":
      return `${typeRef.aggregationType.toUpperCase()} [${typeRef.bound1}:${typeRef.bound2 ?? "?"}] OF ${typeRefToString(typeRef.elementType)}`;
    case "unknown":
      return typeRef.raw;
  }
}

/**
 * 属性を EXPRESS スキーマ風の文字列にフォーマットする。
 */
export function formatAttribute(attr: DirectAttribute): string {
  const opt = attr.optional ? "OPTIONAL " : "";
  return `${attr.name} : ${opt}${typeRefToString(attr.type)}`;
}

// ── 検索スコアリング ────────────────────────────────────

/** 検索スコア定数 */
export const SEARCH_SCORE = {
  /** エンティティ名が完全一致（case-insensitive）例: "Wall" → "IfcWall" の場合は前方一致 */
  NAME_EXACT: 100,
  /** エンティティ名が "Ifc" + query で完全一致（case-insensitive）*/
  NAME_IFC_EXACT: 95,
  /** エンティティ名が前方一致（case-insensitive）例: "IfcWall" → "IfcWallStandardCase" */
  NAME_PREFIX: 80,
  /** エンティティ名に部分一致 例: "IfcCurtainWall" に "Wall" が含まれる */
  NAME_CONTAINS: 60,
  /** 説明文にキーワードが含まれる */
  DESCRIPTION_MATCH: 20,
  /** マッチしない */
  NO_MATCH: 0,
} as const;

/**
 * 検索クエリに対するスコアを計算する。
 * 名前完全一致 > IFC名完全一致 > 名前前方一致 > 名前部分一致 > 説明文一致。
 */
export function calculateSearchScore(
  name: string,
  shortDefinition: string | undefined,
  query: string,
): number {
  const nameLower = name.toLowerCase();
  const q = query.toLowerCase();

  // 名前が完全一致（case-insensitive）
  if (nameLower === q) return SEARCH_SCORE.NAME_EXACT;

  // "Ifc" + query が名前と完全一致（"Wall" → "IfcWall"）
  if (nameLower === `ifc${q}`) return SEARCH_SCORE.NAME_IFC_EXACT;

  // 名前が query で始まる、または "Ifc" + query で始まる
  if (nameLower.startsWith(q) || nameLower.startsWith(`ifc${q}`)) {
    return SEARCH_SCORE.NAME_PREFIX;
  }

  // 名前に query が含まれる
  if (nameLower.includes(q)) return SEARCH_SCORE.NAME_CONTAINS;

  // 説明文に query が含まれる
  if (shortDefinition?.toLowerCase().includes(q)) return SEARCH_SCORE.DESCRIPTION_MATCH;

  return SEARCH_SCORE.NO_MATCH;
}

/**
 * ページネーション情報を含む出力オブジェクトを生成する。
 */
export function buildPaginationMeta(
  total: number,
  count: number,
  offset: number,
  hasMore: boolean,
): Record<string, unknown> {
  return {
    total,
    count,
    offset,
    hasMore,
    ...(hasMore ? { nextOffset: offset + count } : {}),
  };
}
