#!/usr/bin/env python3
"""
IFC EXPRESS Schema → JSON Converter

IfcOpenShell を使って IFC4.3 の EXPRESS スキーマから構造化 JSON を生成する。
WHERE制約は .exp ファイルから直接パースして補完する。

Usage:
    python scripts/convert_express_to_json.py

Output:
    data/generated/ifc4x3-schema.json
"""

import json
import re
import os
import sys
from datetime import datetime, timezone

import ifcopenshell

# ── Paths ──────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
EXP_FILE = os.path.join(PROJECT_ROOT, "data", "raw", "IFC.exp")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "data", "generated")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "ifc4x3-schema.json")

SCHEMA_NAME = "IFC4X3_ADD2"


# ── WHERE制約のパース (.exp ファイルから) ────────────────
def parse_where_rules_from_exp(exp_path: str) -> dict[str, list[dict]]:
    """
    .exp ファイルから ENTITY と TYPE の WHERE ルールを抽出する。
    IfcOpenShell のラッパーからは取得できないため、正規表現で直接パースする。

    Returns:
        { "IfcWall": [{"name": "CorrectPredefinedType", "expression": "NOT(EXISTS(...))"}], ... }
    """
    with open(exp_path, "r", encoding="utf-8") as f:
        content = f.read()

    where_rules: dict[str, list[dict]] = {}

    # ENTITY の WHERE ルール
    entity_pattern = re.compile(
        r'ENTITY\s+(\w+).*?(?:WHERE\s*\n(.*?))?END_ENTITY;',
        re.DOTALL
    )
    for match in entity_pattern.finditer(content):
        entity_name = match.group(1)
        where_block = match.group(2)
        if where_block:
            rules = _parse_where_block(where_block)
            if rules:
                where_rules[entity_name] = rules

    # TYPE の WHERE ルール
    type_pattern = re.compile(
        r'TYPE\s+(\w+)\s*=.*?(?:WHERE\s*\n(.*?))?END_TYPE;',
        re.DOTALL
    )
    for match in type_pattern.finditer(content):
        type_name = match.group(1)
        where_block = match.group(2)
        if where_block:
            rules = _parse_where_block(where_block)
            if rules:
                where_rules[type_name] = rules

    return where_rules


def _parse_where_block(block: str) -> list[dict]:
    """WHERE ブロック内の個別ルールをパースする。"""
    rules = []
    # パターン: "RuleName : expression ;"
    # 複数行にまたがるルールに対応
    rule_pattern = re.compile(r'\s+(\w+)\s*:\s*(.*?);', re.DOTALL)
    for match in rule_pattern.finditer(block):
        name = match.group(1)
        expression = match.group(2).strip()
        # 改行とタブを整理
        expression = re.sub(r'\s+', ' ', expression)
        rules.append({
            "name": name,
            "expression": expression
        })
    return rules


# ── 型情報のシリアライズ ───────────────────────────────
def serialize_type(type_obj) -> dict:
    """属性の型情報を JSON シリアライズ可能な dict に変換する。"""
    type_class = type(type_obj).__name__

    if type_class == "named_type":
        declared = type_obj.declared_type()
        declared_class = type(declared).__name__
        if declared_class == "entity":
            return {"kind": "entity", "name": declared.name()}
        elif declared_class == "type_declaration":
            return {"kind": "type", "name": declared.name()}
        elif declared_class == "enumeration_type":
            return {"kind": "enum", "name": declared.name()}
        elif declared_class == "select_type":
            return {"kind": "select", "name": declared.name()}
        else:
            return {"kind": "named", "name": str(declared)}

    elif type_class == "simple_type":
        return {"kind": "simple", "name": str(type_obj).strip("<>")}

    elif type_class == "aggregation_type":
        return {
            "kind": "aggregation",
            "aggregationType": type_obj.type_of_aggregation_string(),
            "bound1": type_obj.bound1(),
            "bound2": type_obj.bound2() if type_obj.bound2() != -1 else None,
            "elementType": serialize_type(type_obj.type_of_element())
        }

    else:
        return {"kind": "unknown", "raw": str(type_obj)}


# ── エンティティの変換 ─────────────────────────────────
def convert_entity(entity, where_rules: dict) -> dict:
    """ENTITY を JSON dict に変換する。"""
    name = entity.name()

    # Supertype
    supertype = entity.supertype()
    supertype_name = supertype.name() if supertype else None

    # Subtypes
    subtypes = [s.name() for s in entity.subtypes()]

    # Direct attributes (このエンティティで定義されたもの)
    direct_attrs = []
    for attr in entity.attributes():
        direct_attrs.append({
            "name": attr.name(),
            "type": serialize_type(attr.type_of_attribute()),
            "optional": attr.optional()
        })

    # All attributes (継承を含む)
    all_attrs = []
    for attr in entity.all_attributes():
        all_attrs.append({
            "name": attr.name(),
            "type": serialize_type(attr.type_of_attribute()),
            "optional": attr.optional()
        })

    # Inverse attributes
    inverse_attrs = []
    for attr in entity.all_inverse_attributes():
        inverse_attrs.append({
            "name": attr.name(),
            "entityReference": attr.entity_reference().name(),
            "bound1": attr.bound1(),
            "bound2": attr.bound2() if attr.bound2() != -1 else None,
            "aggregationType": attr.type_of_aggregation_string()
        })

    # Derived attributes
    derived = list(entity.derived())

    # WHERE rules (.exp からパース済み)
    where = where_rules.get(name, [])

    # Inheritance chain (ancestors)
    ancestors = []
    current = supertype
    while current:
        ancestors.append(current.name())
        current = current.supertype()

    return {
        "name": name,
        "isAbstract": entity.is_abstract(),
        "supertype": supertype_name,
        "subtypes": subtypes,
        "ancestors": ancestors,
        "directAttributes": direct_attrs,
        "allAttributes": all_attrs,
        "inverseAttributes": inverse_attrs,
        "derivedIndices": derived,
        "whereRules": where
    }


# ── TYPE 宣言の変換 ────────────────────────────────────
def convert_type_declaration(td, where_rules: dict) -> dict:
    """TYPE 宣言を JSON dict に変換する。"""
    name = td.name()
    declared = td.declared_type()
    declared_class = type(declared).__name__

    result = {
        "name": name,
        "declaredType": serialize_type(declared) if declared_class != "simple_type" else {
            "kind": "simple",
            "name": str(declared).strip("<>")
        },
        "whereRules": where_rules.get(name, [])
    }
    return result


# ── Enumeration の変換 ─────────────────────────────────
def convert_enumeration(enum) -> dict:
    """ENUMERATION TYPE を JSON dict に変換する。"""
    return {
        "name": enum.name(),
        "items": list(enum.enumeration_items())
    }


# ── Select の変換 ──────────────────────────────────────
def convert_select(select) -> dict:
    """SELECT TYPE を JSON dict に変換する。"""
    return {
        "name": select.name(),
        "selectList": [s.name() for s in select.select_list()]
    }


# ── FUNCTION / RULE のパース (.exp から) ──────────────
def parse_functions_from_exp(exp_path: str) -> list[dict]:
    """FUNCTION 定義を .exp ファイルから抽出する。"""
    with open(exp_path, "r", encoding="utf-8") as f:
        content = f.read()

    functions = []
    pattern = re.compile(
        r'FUNCTION\s+(\w+)\s*\((.*?)\)\s*:\s*(\w+).*?END_FUNCTION;',
        re.DOTALL
    )
    for match in pattern.finditer(content):
        name = match.group(1)
        params_raw = match.group(2).strip()
        return_type = match.group(3).strip()
        functions.append({
            "name": name,
            "returnType": return_type,
            "parametersRaw": re.sub(r'\s+', ' ', params_raw)
        })
    return functions


def parse_global_rules_from_exp(exp_path: str) -> list[dict]:
    """RULE 定義を .exp ファイルから抽出する。"""
    with open(exp_path, "r", encoding="utf-8") as f:
        content = f.read()

    rules = []
    pattern = re.compile(
        r'RULE\s+(\w+)\s+FOR\s*\n\s*\((\w+)\);(.*?)WHERE\s*\n(.*?)END_RULE;',
        re.DOTALL
    )
    for match in pattern.finditer(content):
        name = match.group(1)
        target = match.group(2)
        body = match.group(4).strip()
        where_rules = _parse_where_block(body)
        rules.append({
            "name": name,
            "forEntity": target,
            "whereRules": where_rules
        })
    return rules


# ── メイン処理 ─────────────────────────────────────────
def main():
    print(f"Loading schema: {SCHEMA_NAME}")
    schema = ifcopenshell.ifcopenshell_wrapper.schema_by_name(SCHEMA_NAME)

    print(f"Parsing WHERE rules from: {EXP_FILE}")
    where_rules = parse_where_rules_from_exp(EXP_FILE)
    print(f"  WHERE rules found for {len(where_rules)} declarations")

    # Declarations をカテゴリ別に分類
    entities = []
    type_declarations = []
    enumerations = []
    selects = []

    for decl in schema.declarations():
        decl_type = type(decl).__name__
        if decl_type == "entity":
            entities.append(decl)
        elif decl_type == "type_declaration":
            type_declarations.append(decl)
        elif decl_type == "enumeration_type":
            enumerations.append(decl)
        elif decl_type == "select_type":
            selects.append(decl)

    print(f"Converting: {len(entities)} entities, {len(type_declarations)} types, "
          f"{len(enumerations)} enums, {len(selects)} selects")

    # 変換
    entities_json = [convert_entity(e, where_rules) for e in entities]
    types_json = [convert_type_declaration(td, where_rules) for td in type_declarations]
    enums_json = [convert_enumeration(e) for e in enumerations]
    selects_json = [convert_select(s) for s in selects]

    # Functions & Rules
    print("Parsing FUNCTION / RULE definitions from .exp")
    functions = parse_functions_from_exp(EXP_FILE)
    global_rules = parse_global_rules_from_exp(EXP_FILE)

    # 出力データ構造
    output = {
        "$schema": "ifc4x3-express-schema",
        "version": "IFC4.3",
        "schemaIdentifier": "IFC4X3_DEV_923b0514",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "generator": "convert_express_to_json.py (IfcOpenShell + .exp parsing)",
        "statistics": {
            "entities": len(entities_json),
            "typeDeclarations": len(types_json),
            "enumerations": len(enums_json),
            "selectTypes": len(selects_json),
            "functions": len(functions),
            "globalRules": len(global_rules)
        },
        "entities": sorted(entities_json, key=lambda x: x["name"]),
        "typeDeclarations": sorted(types_json, key=lambda x: x["name"]),
        "enumerations": sorted(enums_json, key=lambda x: x["name"]),
        "selectTypes": sorted(selects_json, key=lambda x: x["name"]),
        "functions": functions,
        "globalRules": global_rules
    }

    # 出力
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    file_size = os.path.getsize(OUTPUT_FILE)
    print(f"\n✅ Output: {OUTPUT_FILE}")
    print(f"   Size: {file_size / 1024 / 1024:.1f} MB")
    print(f"   Statistics: {json.dumps(output['statistics'], indent=4)}")


if __name__ == "__main__":
    main()
