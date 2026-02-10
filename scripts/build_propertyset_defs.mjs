/**
 * PropertySet プロパティ定義の抽出スクリプト
 *
 * data/raw/IFC.json から PropertySet とプロパティの紐付けを抽出し、
 * data/generated/ifc4x3-propertyset-defs.json として出力する。
 *
 * IFC.json のデータ構造:
 *   - Classes[].ClassProperties[] → { PropertyCode, PropertySet } の組み合わせ
 *   - Properties[] → { Code, Name, DataType, PropertyValueKind, Description } の定義
 *
 * 出力形式:
 *   {
 *     "$schema": "...",
 *     "generatedAt": "...",
 *     "statistics": { "propertySets": N, "properties": N },
 *     "propertySets": {
 *       "Pset_WallCommon": {
 *         "properties": [
 *           { "name": "IsExternal", "dataType": "Boolean", "valueKind": "Single",
 *             "ifcType": "IfcBoolean", "description": "..." },
 *           ...
 *         ],
 *         "applicableEntities": ["IfcWall", "IfcWallStandardCase"]
 *       }
 *     }
 *   }
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RAW_FILE = resolve(__dirname, "../data/raw/IFC.json");
const OUTPUT_FILE = resolve(__dirname, "../data/generated/ifc4x3-propertyset-defs.json");

/**
 * Description テキストから IFC の型名を抽出する。
 * 例: "Technical note: in IFC this property takes IfcBoolean as value." → "IfcBoolean"
 */
function extractIfcType(description) {
  if (!description) return null;
  const match = description.match(/takes\s+(Ifc\w+)\s+as\s+value/);
  return match ? match[1] : null;
}

function main() {
  console.log("[build_propertyset_defs] Loading IFC.json...");
  const raw = readFileSync(RAW_FILE, "utf-8");
  const data = JSON.parse(raw);

  // プロパティ定義のルックアップ
  const propMap = new Map();
  for (const p of data.Properties) {
    propMap.set(p.Code, p);
  }

  // PropertySet → プロパティ名 Set のマッピング
  // + PropertySet → 適用先エンティティ名のマッピング
  const psetPropsMap = new Map();     // Pset_Name → Set<PropertyCode>
  const psetEntitiesMap = new Map();  // Pset_Name → Set<ClassName>

  for (const cls of data.Classes) {
    if (!cls.ClassProperties) continue;

    // IFC.json では PredefinedType 値は全大文字名（例: "ELEMENTEDWALL"）、
    // エンティティは先頭大文字（例: "Wall"）。エンティティのみ記録する。
    const isEntity = cls.Name && cls.Name !== cls.Name.toUpperCase();
    const entityName = isEntity ? `Ifc${cls.Name}` : null;

    for (const cp of cls.ClassProperties) {
      if (!cp.PropertySet) continue;

      // プロパティの追加
      if (!psetPropsMap.has(cp.PropertySet)) {
        psetPropsMap.set(cp.PropertySet, new Set());
      }
      psetPropsMap.get(cp.PropertySet).add(cp.PropertyCode);

      // 適用先エンティティの追加（PredefinedType は除外）
      if (entityName) {
        if (!psetEntitiesMap.has(cp.PropertySet)) {
          psetEntitiesMap.set(cp.PropertySet, new Set());
        }
        psetEntitiesMap.get(cp.PropertySet).add(entityName);
      }
    }
  }

  // 出力データの構築
  const propertySets = {};
  let totalProps = 0;

  for (const [psetName, propCodes] of [...psetPropsMap.entries()].sort()) {
    const properties = [];

    for (const code of [...propCodes].sort()) {
      const p = propMap.get(code);
      if (!p) continue;

      const ifcType = extractIfcType(p.Description);

      properties.push({
        name: p.Name,
        dataType: p.DataType || null,
        valueKind: p.PropertyValueKind || "Single",
        ifcType: ifcType,
        description: p.Definition || null,
      });
    }

    const entities = psetEntitiesMap.get(psetName);

    propertySets[psetName] = {
      properties,
      applicableEntities: entities ? [...entities].sort() : [],
    };

    totalProps += properties.length;
  }

  const output = {
    $schema: "ifc4x3-propertyset-defs.schema.json",
    generatedAt: new Date().toISOString(),
    generator: "build_propertyset_defs.mjs",
    statistics: {
      propertySets: Object.keys(propertySets).length,
      properties: totalProps,
    },
    propertySets,
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");

  console.log(
    `[build_propertyset_defs] Generated: ${output.statistics.propertySets} PropertySets, ${output.statistics.properties} property entries`,
  );
  console.log(`[build_propertyset_defs] Output: ${OUTPUT_FILE}`);
}

main();
