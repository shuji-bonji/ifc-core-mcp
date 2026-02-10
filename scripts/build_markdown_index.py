#!/usr/bin/env python3
"""
IFC Markdown Description Index Builder

IFC4.3.x-development リポジトリの docs/schemas/ 配下の Markdown ファイルから
説明文インデックスを構築する。

各 Markdown ファイルから以下を抽出:
  - エンティティ/型名
  - 短い説明 (short definition)
  - 全文テキスト
  - 属する層 (core/shared/domain/resource)
  - 属するスキーマ (IfcKernel, IfcSharedBldgElements, etc.)
  - カテゴリ (Entities/Types/Functions/PropertySets/QuantitySets/PropertyEnumerations)

Usage:
    python scripts/build_markdown_index.py <path-to-ifc4.3-dev-repo>

Output:
    data/generated/ifc4x3-descriptions.json
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


def extract_short_definition(content: str) -> str:
    """<!-- end of short definition --> マーカーまでのテキストを抽出する。"""
    # タイトル行を除いた、マーカーまでのテキスト
    marker = "<!-- end of short definition -->"
    idx = content.find(marker)
    if idx == -1:
        # マーカーがない場合は最初の段落を取得
        lines = content.split("\n")
        paragraphs = []
        for line in lines:
            if line.startswith("# "):
                continue  # タイトルスキップ
            if line.strip() == "" and paragraphs:
                break
            if line.strip():
                paragraphs.append(line.strip())
        return " ".join(paragraphs) if paragraphs else ""

    # タイトル行の後からマーカーまで
    text_before_marker = content[:idx]
    lines = text_before_marker.split("\n")
    description_lines = []
    for line in lines:
        if line.startswith("# "):
            continue
        stripped = line.strip()
        if stripped:
            description_lines.append(stripped)

    return " ".join(description_lines)


def extract_sections(content: str) -> dict[str, str]:
    """H2 セクション (## ...) ごとにテキストを分割する。"""
    sections = {}
    current_section = None
    current_lines = []

    for line in content.split("\n"):
        if line.startswith("## "):
            if current_section:
                sections[current_section] = "\n".join(current_lines).strip()
            current_section = line[3:].strip()
            current_lines = []
        elif current_section:
            current_lines.append(line)

    if current_section:
        sections[current_section] = "\n".join(current_lines).strip()

    return sections


def extract_history(content: str) -> list[str]:
    """HISTORY / CHANGE 情報を抽出する。"""
    history = []
    for line in content.split("\n"):
        stripped = line.strip()
        # > HISTORY ... or > IFC4 CHANGE ... or > IFC2x3 CHANGE ...
        if stripped.startswith("> HISTORY") or stripped.startswith("> IFC"):
            history.append(stripped.lstrip("> ").strip())
    return history


def process_markdown_file(filepath: Path, repo_root: Path) -> dict | None:
    """Markdown ファイルを処理して構造化データを返す。"""
    try:
        content = filepath.read_text(encoding="utf-8")
    except Exception as e:
        print(f"  WARNING: Cannot read {filepath}: {e}")
        return None

    if not content.strip():
        return None

    # パスからメタデータを抽出
    # docs/schemas/{layer}/{schema}/{category}/{name}.md
    rel_path = filepath.relative_to(repo_root)
    parts = rel_path.parts  # ('docs', 'schemas', 'core', 'IfcKernel', 'Entities', 'IfcWall.md')

    if len(parts) < 6:
        return None

    layer = parts[2]       # core, shared, domain, resource
    schema = parts[3]      # IfcKernel, IfcSharedBldgElements, etc.
    category = parts[4]    # Entities, Types, Functions, etc.
    filename = parts[5]    # IfcWall.md

    name = filename.replace(".md", "")

    # タイトル行から名前を取得（ファイル名と一致するはず）
    title_match = re.match(r"^#\s+(\w+)", content)
    title_name = title_match.group(1) if title_match else name

    short_def = extract_short_definition(content)
    sections = extract_sections(content)
    history = extract_history(content)

    return {
        "name": title_name,
        "layer": layer,
        "schema": schema,
        "category": category,
        "shortDefinition": short_def,
        "sections": sections,
        "history": history,
        "markdownPath": str(rel_path),
        "fullText": content
    }


def build_index(repo_root: Path) -> dict:
    """docs/schemas/ 配下の全 Markdown ファイルを処理してインデックスを構築する。"""
    schemas_dir = repo_root / "docs" / "schemas"

    if not schemas_dir.exists():
        print(f"ERROR: {schemas_dir} does not exist")
        sys.exit(1)

    # カテゴリ別に収集
    entities = {}
    types = {}
    functions = {}
    property_sets = {}
    quantity_sets = {}
    property_enumerations = {}
    global_rules = {}
    readmes = {}

    category_map = {
        "Entities": entities,
        "Types": types,
        "Functions": functions,
        "PropertySets": property_sets,
        "QuantitySets": quantity_sets,
        "PropertyEnumerations": property_enumerations,
        "GlobalRules": global_rules,
    }

    # 全 Markdown ファイルを走査
    md_files = list(schemas_dir.rglob("*.md"))
    print(f"Found {len(md_files)} Markdown files")

    for md_file in sorted(md_files):
        rel = md_file.relative_to(repo_root)
        parts = rel.parts

        # README.md はスキーマ説明として保存
        if md_file.name == "README.md" and len(parts) >= 4:
            layer = parts[2]
            schema = parts[3] if len(parts) > 3 else layer
            try:
                content = md_file.read_text(encoding="utf-8")
                readmes[schema] = {
                    "layer": layer,
                    "schema": schema,
                    "content": content
                }
            except Exception:
                pass
            continue

        # 通常の定義ファイル
        result = process_markdown_file(md_file, repo_root)
        if result is None:
            continue

        cat = result["category"]
        if cat in category_map:
            category_map[cat][result["name"]] = result
        else:
            print(f"  Unknown category: {cat} for {result['name']}")

    return {
        "entities": entities,
        "types": types,
        "functions": functions,
        "propertySets": property_sets,
        "quantitySets": quantity_sets,
        "propertyEnumerations": property_enumerations,
        "globalRules": global_rules,
        "schemaReadmes": readmes,
    }


def build_lightweight_index(full_index: dict) -> dict:
    """
    fullText を除いた軽量インデックスを生成する。
    MCP サーバーが検索・一覧表示に使う用。
    """
    lightweight = {}

    for category, items in full_index.items():
        if category == "schemaReadmes":
            continue

        lightweight[category] = {}
        for name, data in items.items():
            entry = {
                "name": data["name"],
                "layer": data["layer"],
                "schema": data["schema"],
                "category": data["category"],
                "shortDefinition": data["shortDefinition"],
                "history": data["history"],
                "markdownPath": data["markdownPath"],
            }
            lightweight[category][name] = entry

    return lightweight


def main():
    if len(sys.argv) < 2:
        print("Usage: python build_markdown_index.py <path-to-ifc4.3-dev-repo>")
        sys.exit(1)

    repo_root = Path(sys.argv[1])
    print(f"Repository root: {repo_root}")

    full_index = build_index(repo_root)

    # 統計
    stats = {}
    for category, items in full_index.items():
        stats[category] = len(items)
    print(f"\nStatistics: {json.dumps(stats, indent=2)}")

    # 出力先
    output_dir = Path(__file__).parent.parent / "data" / "generated"
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. 軽量インデックス（検索・一覧用）
    lightweight = build_lightweight_index(full_index)
    lightweight_output = {
        "$schema": "ifc4x3-description-index",
        "version": "IFC4.3",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "generator": "build_markdown_index.py",
        "statistics": stats,
        "index": lightweight
    }

    lightweight_path = output_dir / "ifc4x3-descriptions-index.json"
    with open(lightweight_path, "w", encoding="utf-8") as f:
        json.dump(lightweight_output, f, indent=2, ensure_ascii=False)
    print(f"\n✅ Lightweight index: {lightweight_path} ({os.path.getsize(lightweight_path) / 1024:.0f} KB)")

    # 2. 全文データ（Markdown本文含む）
    full_output = {
        "$schema": "ifc4x3-descriptions-full",
        "version": "IFC4.3",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "generator": "build_markdown_index.py",
        "statistics": stats,
        "data": full_index
    }

    full_path = output_dir / "ifc4x3-descriptions-full.json"
    with open(full_path, "w", encoding="utf-8") as f:
        json.dump(full_output, f, indent=2, ensure_ascii=False)
    print(f"✅ Full descriptions: {full_path} ({os.path.getsize(full_path) / 1024 / 1024:.1f} MB)")

    # 3. マッピング検証：スキーマ JSON のエンティティとの一致率
    schema_path = output_dir / "ifc4x3-schema.json"
    if schema_path.exists():
        with open(schema_path, "r") as f:
            schema_data = json.load(f)

        schema_entities = {e["name"] for e in schema_data["entities"]}
        md_entities = set(full_index["entities"].keys())

        matched = schema_entities & md_entities
        only_schema = schema_entities - md_entities
        only_md = md_entities - schema_entities

        print(f"\n=== Entity Mapping Validation ===")
        print(f"  Schema entities:   {len(schema_entities)}")
        print(f"  Markdown entities: {len(md_entities)}")
        print(f"  Matched:           {len(matched)} ({100*len(matched)/len(schema_entities):.1f}%)")
        if only_schema:
            print(f"  Only in schema:    {len(only_schema)}")
            for name in sorted(only_schema)[:10]:
                print(f"    - {name}")
        if only_md:
            print(f"  Only in markdown:  {len(only_md)}")
            for name in sorted(only_md)[:10]:
                print(f"    - {name}")

        # Types マッピングも検証
        schema_enums = {e["name"] for e in schema_data["enumerations"]}
        schema_types = {t["name"] for t in schema_data["typeDeclarations"]}
        schema_selects = {s["name"] for s in schema_data["selectTypes"]}
        all_schema_types = schema_enums | schema_types | schema_selects

        md_types = set(full_index["types"].keys())
        type_matched = all_schema_types & md_types

        print(f"\n=== Type Mapping Validation ===")
        print(f"  Schema types:    {len(all_schema_types)}")
        print(f"  Markdown types:  {len(md_types)}")
        print(f"  Matched:         {len(type_matched)} ({100*len(type_matched)/len(all_schema_types):.1f}%)")


if __name__ == "__main__":
    main()
