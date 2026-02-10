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
