/**
 * IFC Schema Data Loader
 *
 * JSON ファイルを読み込み、高速検索用のインデックスを構築する。
 * すべての検索・取得操作を提供するサービス。
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  IfcSchemaData,
  IfcEntity,
  IfcTypeDeclaration,
  IfcEnumeration,
  IfcSelectType,
  DescriptionIndex,
  DescriptionFullData,
  DescriptionEntry,
  DescriptionFullEntry,
} from "../types.js";
import {
  SERVER_NAME,
  DATA_DIR_RELATIVE,
  SCHEMA_FILE,
  DESC_INDEX_FILE,
  DESC_FULL_FILE,
} from "../constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** データディレクトリの絶対パス */
const DATA_DIR = resolve(__dirname, DATA_DIR_RELATIVE);

// ── シングルトンデータストア ──────────────────────────

let schemaData: IfcSchemaData | null = null;
let descIndex: DescriptionIndex | null = null;
let descFull: DescriptionFullData | null = null;

// ── 検索インデックス（Map ベースで O(1) ルックアップ）──

const entityMap = new Map<string, IfcEntity>();
const entityMapLower = new Map<string, IfcEntity>();
const typeDeclarationMap = new Map<string, IfcTypeDeclaration>();
const enumerationMap = new Map<string, IfcEnumeration>();
const selectTypeMap = new Map<string, IfcSelectType>();

/**
 * PropertySet の配列キャッシュ。
 * searchPropertySets() で毎回 Object.values() するのを避ける。
 */
let propertySetArray: DescriptionEntry[] | null = null;

// ── ファイル読み込み ────────────────────────────────

function loadJsonFile<T>(filename: string): T {
  const filepath = resolve(DATA_DIR, filename);
  const raw = readFileSync(filepath, "utf-8");
  return JSON.parse(raw) as T;
}

// ── 初期化 ────────────────────────────────────────────

export function initialize(): void {
  if (schemaData) return; // 二重初期化防止

  console.error(`[${SERVER_NAME}] Loading schema data...`);

  schemaData = loadJsonFile<IfcSchemaData>(SCHEMA_FILE);
  descIndex = loadJsonFile<DescriptionIndex>(DESC_INDEX_FILE);
  descFull = loadJsonFile<DescriptionFullData>(DESC_FULL_FILE);

  // エンティティのインデックスを構築
  for (const entity of schemaData.entities) {
    entityMap.set(entity.name, entity);
    entityMapLower.set(entity.name.toLowerCase(), entity);
  }

  for (const td of schemaData.typeDeclarations) {
    typeDeclarationMap.set(td.name, td);
  }

  for (const en of schemaData.enumerations) {
    enumerationMap.set(en.name, en);
  }

  for (const st of schemaData.selectTypes) {
    selectTypeMap.set(st.name, st);
  }

  // PropertySet 配列をキャッシュ
  propertySetArray = Object.values(descIndex.index.propertySets);

  console.error(
    `[${SERVER_NAME}] Loaded: ${entityMap.size} entities, ` +
      `${typeDeclarationMap.size} types, ${enumerationMap.size} enums, ` +
      `${selectTypeMap.size} selects`,
  );
}

// ── エンティティ検索 ──────────────────────────────────

/**
 * エンティティを名前で取得する（大文字小文字区別なし）。
 */
export function getEntity(name: string): IfcEntity | undefined {
  return entityMap.get(name) ?? entityMapLower.get(name.toLowerCase());
}

/**
 * キーワードでエンティティを検索する。
 * 名前と説明文の両方を対象にする。
 */
export function searchEntities(
  query: string,
  limit: number = 20,
  offset: number = 0,
): {
  results: IfcEntity[];
  total: number;
  hasMore: boolean;
} {
  const q = query.toLowerCase();

  const matched = schemaData!.entities.filter((e) => {
    if (e.name.toLowerCase().includes(q)) return true;

    const desc = descIndex?.index.entities[e.name];
    if (desc?.shortDefinition.toLowerCase().includes(q)) return true;

    return false;
  });

  const total = matched.length;
  const results = matched.slice(offset, offset + limit);

  return { results, total, hasMore: total > offset + limit };
}

// ── 型検索 ────────────────────────────────────────────

export function getTypeDeclaration(name: string): IfcTypeDeclaration | undefined {
  return typeDeclarationMap.get(name);
}

export function getEnumeration(name: string): IfcEnumeration | undefined {
  return enumerationMap.get(name);
}

export function getSelectType(name: string): IfcSelectType | undefined {
  return selectTypeMap.get(name);
}

// ── 説明文 ────────────────────────────────────────────

export function getEntityDescription(name: string): DescriptionEntry | undefined {
  return descIndex?.index.entities[name];
}

export function getEntityFullDescription(name: string): DescriptionFullEntry | undefined {
  return descFull?.data.entities[name];
}

export function getTypeDescription(name: string): DescriptionEntry | undefined {
  return descIndex?.index.types[name];
}

export function getTypeFullDescription(name: string): DescriptionFullEntry | undefined {
  return descFull?.data.types[name];
}

export function getPropertySetDescription(name: string): DescriptionFullEntry | undefined {
  return descFull?.data.propertySets[name];
}

// ── PropertySet 検索 ────────────────────────────────

/**
 * キーワードで PropertySet を検索する。
 * キャッシュ済み配列を使い Object.values() の繰り返し呼び出しを回避。
 */
export function searchPropertySets(
  query: string,
  limit: number = 20,
  offset: number = 0,
): {
  results: DescriptionEntry[];
  total: number;
  hasMore: boolean;
} {
  if (!propertySetArray) return { results: [], total: 0, hasMore: false };

  const q = query.toLowerCase();

  const matched = propertySetArray.filter((ps) => {
    if (ps.name.toLowerCase().includes(q)) return true;
    if (ps.shortDefinition.toLowerCase().includes(q)) return true;
    return false;
  });

  const total = matched.length;
  const results = matched.slice(offset, offset + limit);

  return { results, total, hasMore: total > offset + limit };
}

// ── 継承ツリー ────────────────────────────────────────

export interface InheritanceNode {
  name: string;
  isAbstract: boolean;
  children: InheritanceNode[];
}

/**
 * 指定エンティティから下方向の継承ツリーを構築する。
 */
export function getInheritanceTree(name: string, depth: number = 5): InheritanceNode | undefined {
  const entity = getEntity(name);
  if (!entity) return undefined;

  function buildTree(entityName: string, currentDepth: number): InheritanceNode {
    const e = getEntity(entityName);
    if (!e) return { name: entityName, isAbstract: false, children: [] };

    const children =
      currentDepth < depth ? e.subtypes.map((st) => buildTree(st, currentDepth + 1)) : [];

    return {
      name: e.name,
      isAbstract: e.isAbstract,
      children,
    };
  }

  return buildTree(name, 0);
}

/**
 * 指定エンティティから上方向の祖先チェーンを取得する。
 */
export function getAncestorChain(name: string): string[] {
  const entity = getEntity(name);
  if (!entity) return [];
  return [name, ...entity.ancestors];
}

// ── 統計情報 ──────────────────────────────────────────

export function getStatistics(): Record<string, number> {
  return schemaData?.statistics ?? {};
}
