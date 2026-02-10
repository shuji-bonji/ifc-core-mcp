/**
 * IFC Core MCP Server - Type Definitions
 *
 * IFC4.3 EXPRESS スキーマから生成された JSON データの型定義
 */

// ── 属性の型情報 ──────────────────────────────────────

export interface TypeRefSimple {
  kind: "simple";
  name: string; // "string", "real", "integer", "boolean", "binary", "logical", "number"
}

export interface TypeRefEntity {
  kind: "entity";
  name: string;
}

export interface TypeRefType {
  kind: "type";
  name: string;
}

export interface TypeRefEnum {
  kind: "enum";
  name: string;
}

export interface TypeRefSelect {
  kind: "select";
  name: string;
}

export interface TypeRefAggregation {
  kind: "aggregation";
  aggregationType: "list" | "set" | "array" | "bag";
  bound1: number;
  bound2: number | null;
  elementType: TypeRef;
}

export interface TypeRefNamed {
  kind: "named";
  name: string;
}

export interface TypeRefUnknown {
  kind: "unknown";
  raw: string;
}

export type TypeRef =
  | TypeRefSimple
  | TypeRefEntity
  | TypeRefType
  | TypeRefEnum
  | TypeRefSelect
  | TypeRefAggregation
  | TypeRefNamed
  | TypeRefUnknown;

// ── 属性 ──────────────────────────────────────────────

export interface DirectAttribute {
  name: string;
  type: TypeRef;
  optional: boolean;
}

export interface InverseAttribute {
  name: string;
  entityReference: string;
  bound1: number;
  bound2: number | null;
  aggregationType: string;
}

export interface WhereRule {
  name: string;
  expression: string;
}

// ── エンティティ ──────────────────────────────────────

export interface IfcEntity {
  name: string;
  isAbstract: boolean;
  supertype: string | null;
  subtypes: string[];
  ancestors: string[];
  directAttributes: DirectAttribute[];
  allAttributes: DirectAttribute[];
  inverseAttributes: InverseAttribute[];
  derivedIndices: boolean[];
  whereRules: WhereRule[];
}

// ── TYPE 宣言 ─────────────────────────────────────────

export interface IfcTypeDeclaration {
  name: string;
  declaredType: TypeRef;
  whereRules: WhereRule[];
}

// ── Enumeration ───────────────────────────────────────

export interface IfcEnumeration {
  name: string;
  items: string[];
}

// ── Select Type ───────────────────────────────────────

export interface IfcSelectType {
  name: string;
  selectList: string[];
}

// ── Function ──────────────────────────────────────────

export interface IfcFunction {
  name: string;
  returnType: string;
  parametersRaw: string;
}

// ── Global Rule ───────────────────────────────────────

export interface IfcGlobalRule {
  name: string;
  forEntity: string;
  whereRules: WhereRule[];
}

// ── スキーマ全体 ──────────────────────────────────────

export interface IfcSchemaData {
  $schema: string;
  version: string;
  schemaIdentifier: string;
  generatedAt: string;
  generator: string;
  statistics: {
    entities: number;
    typeDeclarations: number;
    enumerations: number;
    selectTypes: number;
    functions: number;
    globalRules: number;
  };
  entities: IfcEntity[];
  typeDeclarations: IfcTypeDeclaration[];
  enumerations: IfcEnumeration[];
  selectTypes: IfcSelectType[];
  functions: IfcFunction[];
  globalRules: IfcGlobalRule[];
}

// ── 説明文インデックス ────────────────────────────────

export interface DescriptionEntry {
  name: string;
  layer: "core" | "shared" | "domain" | "resource";
  schema: string;
  category:
    | "Entities"
    | "Types"
    | "Functions"
    | "PropertySets"
    | "QuantitySets"
    | "PropertyEnumerations"
    | "GlobalRules";
  shortDefinition: string;
  history: string[];
  markdownPath: string;
}

export interface DescriptionFullEntry extends DescriptionEntry {
  sections: Record<string, string>;
  fullText: string;
}

export interface DescriptionIndex {
  $schema: string;
  version: string;
  generatedAt: string;
  generator: string;
  statistics: Record<string, number>;
  index: {
    entities: Record<string, DescriptionEntry>;
    types: Record<string, DescriptionEntry>;
    functions: Record<string, DescriptionEntry>;
    propertySets: Record<string, DescriptionEntry>;
    quantitySets: Record<string, DescriptionEntry>;
    propertyEnumerations: Record<string, DescriptionEntry>;
    globalRules: Record<string, DescriptionEntry>;
  };
}

export interface DescriptionFullData {
  $schema: string;
  version: string;
  generatedAt: string;
  generator: string;
  statistics: Record<string, number>;
  data: {
    entities: Record<string, DescriptionFullEntry>;
    types: Record<string, DescriptionFullEntry>;
    functions: Record<string, DescriptionFullEntry>;
    propertySets: Record<string, DescriptionFullEntry>;
    quantitySets: Record<string, DescriptionFullEntry>;
    propertyEnumerations: Record<string, DescriptionFullEntry>;
    globalRules: Record<string, DescriptionFullEntry>;
  };
}

// ── レスポンス形式 ────────────────────────────────────

export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}
