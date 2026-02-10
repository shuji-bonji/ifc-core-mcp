/**
 * schema-loader.ts ユニットテスト
 *
 * データロードとインデックス検索の正当性を検証する。
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  initialize,
  getEntity,
  searchEntities,
  getTypeDeclaration,
  getEnumeration,
  getSelectType,
  getEntityDescription,
  getEntityFullDescription,
  getTypeDescription,
  getPropertySetDescription,
  searchPropertySets,
  getInheritanceTree,
  getAncestorChain,
  getStatistics,
} from "../../src/services/schema-loader.js";

beforeAll(() => {
  initialize();
});

// ── initialize ──────────────────────────────────────────

describe("initialize", () => {
  it("should load schema data successfully", () => {
    const stats = getStatistics();
    expect(stats).toBeDefined();
    expect(stats.entities).toBeGreaterThan(800); // IFC4.3 has 876 entities
    expect(stats.enumerations).toBeGreaterThan(200);
  });
});

// ── getEntity ───────────────────────────────────────────

describe("getEntity", () => {
  it("should find entity by exact name", () => {
    const entity = getEntity("IfcWall");
    expect(entity).toBeDefined();
    expect(entity!.name).toBe("IfcWall");
    expect(entity!.isAbstract).toBe(false);
  });

  it("should find entity case-insensitively", () => {
    const entity = getEntity("ifcwall");
    expect(entity).toBeDefined();
    expect(entity!.name).toBe("IfcWall");
  });

  it("should return undefined for non-existent entity", () => {
    const entity = getEntity("IfcNotExist");
    expect(entity).toBeUndefined();
  });

  it("should include supertype info for IfcWall", () => {
    const entity = getEntity("IfcWall");
    expect(entity!.supertype).toBe("IfcBuiltElement");
  });

  it("should include ancestor chain", () => {
    const entity = getEntity("IfcWall");
    expect(entity!.ancestors).toContain("IfcBuiltElement");
    expect(entity!.ancestors).toContain("IfcRoot");
  });

  it("should include direct attributes", () => {
    const entity = getEntity("IfcWall");
    const attrNames = entity!.directAttributes.map((a) => a.name);
    expect(attrNames).toContain("PredefinedType");
  });

  it("should include all attributes (inherited + direct)", () => {
    const entity = getEntity("IfcWall");
    const allNames = entity!.allAttributes.map((a) => a.name);
    // Inherited from IfcRoot
    expect(allNames).toContain("GlobalId");
    expect(allNames).toContain("Name");
    // Direct
    expect(allNames).toContain("PredefinedType");
  });

  it("should detect abstract entities", () => {
    const entity = getEntity("IfcRoot");
    expect(entity).toBeDefined();
    expect(entity!.isAbstract).toBe(true);
  });

  it("should include WHERE rules when present", () => {
    const entity = getEntity("IfcWall");
    expect(entity!.whereRules).toBeDefined();
    expect(Array.isArray(entity!.whereRules)).toBe(true);
    // IfcWall has CorrectPredefinedType rule
    if (entity!.whereRules.length > 0) {
      expect(entity!.whereRules[0]).toHaveProperty("name");
      expect(entity!.whereRules[0]).toHaveProperty("expression");
    }
  });

  it("should include subtypes for IfcProduct", () => {
    const entity = getEntity("IfcProduct");
    expect(entity!.subtypes.length).toBeGreaterThan(0);
  });
});

// ── searchEntities ──────────────────────────────────────

describe("searchEntities", () => {
  it("should find entities by name substring", () => {
    const { results, total } = searchEntities("Wall");
    expect(total).toBeGreaterThan(0);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((e) => e.name === "IfcWall")).toBe(true);
  });

  it("should be case-insensitive", () => {
    const { total: t1 } = searchEntities("wall");
    const { total: t2 } = searchEntities("Wall");
    expect(t1).toBe(t2);
  });

  it("should respect limit parameter", () => {
    const { results } = searchEntities("Ifc", 5);
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it("should support pagination with offset", () => {
    const page1 = searchEntities("Ifc", 5, 0);
    const page2 = searchEntities("Ifc", 5, 5);
    expect(page1.results[0].name).not.toBe(page2.results[0].name);
  });

  it("should set hasMore correctly", () => {
    const { total, hasMore } = searchEntities("Ifc", 5, 0);
    expect(total).toBeGreaterThan(5);
    expect(hasMore).toBe(true);
  });

  it("should return empty results for unknown query", () => {
    const { results, total } = searchEntities("xyzzynotexist");
    expect(results.length).toBe(0);
    expect(total).toBe(0);
  });
});

// ── getTypeDeclaration ──────────────────────────────────

describe("getTypeDeclaration", () => {
  it("should find a type declaration", () => {
    const td = getTypeDeclaration("IfcLabel");
    expect(td).toBeDefined();
    expect(td!.name).toBe("IfcLabel");
    expect(td!.declaredType).toBeDefined();
  });

  it("should return undefined for non-existent type", () => {
    expect(getTypeDeclaration("NotAType")).toBeUndefined();
  });
});

// ── getEnumeration ──────────────────────────────────────

describe("getEnumeration", () => {
  it("should find enumeration with items", () => {
    const e = getEnumeration("IfcWallTypeEnum");
    expect(e).toBeDefined();
    expect(e!.items.length).toBeGreaterThan(0);
    expect(e!.items).toContain("MOVABLE");
  });

  it("should return undefined for non-existent enum", () => {
    expect(getEnumeration("NotAnEnum")).toBeUndefined();
  });
});

// ── getSelectType ───────────────────────────────────────

describe("getSelectType", () => {
  it("should find select type with select list", () => {
    const s = getSelectType("IfcValue");
    expect(s).toBeDefined();
    expect(s!.selectList.length).toBeGreaterThan(0);
  });

  it("should return undefined for non-existent select", () => {
    expect(getSelectType("NotASelect")).toBeUndefined();
  });
});

// ── Description lookups ─────────────────────────────────

describe("getEntityDescription", () => {
  it("should return description entry for known entity", () => {
    const desc = getEntityDescription("IfcWall");
    expect(desc).toBeDefined();
    expect(desc!.name).toBe("IfcWall");
    expect(desc!.layer).toBeDefined();
    expect(desc!.schema).toBeDefined();
    expect(desc!.shortDefinition).toBeDefined();
    expect(desc!.shortDefinition.length).toBeGreaterThan(0);
  });

  it("should return undefined for unknown entity", () => {
    expect(getEntityDescription("IfcNotExist")).toBeUndefined();
  });
});

describe("getEntityFullDescription", () => {
  it("should return full description with sections", () => {
    const full = getEntityFullDescription("IfcWall");
    expect(full).toBeDefined();
    expect(full!.fullText).toBeDefined();
    expect(full!.fullText.length).toBeGreaterThan(100);
    expect(full!.sections).toBeDefined();
  });
});

describe("getTypeDescription", () => {
  it("should return type description", () => {
    const desc = getTypeDescription("IfcLabel");
    expect(desc).toBeDefined();
    expect(desc!.name).toBe("IfcLabel");
  });
});

// ── PropertySet ─────────────────────────────────────────

describe("getPropertySetDescription", () => {
  it("should return PropertySet description for known name", () => {
    const pset = getPropertySetDescription("Pset_WallCommon");
    expect(pset).toBeDefined();
    expect(pset!.name).toBe("Pset_WallCommon");
    expect(pset!.layer).toBeDefined();
  });

  it("should return undefined for unknown PropertySet", () => {
    expect(getPropertySetDescription("Pset_NotExist")).toBeUndefined();
  });
});

describe("searchPropertySets", () => {
  it("should find PropertySets by keyword", () => {
    const { results, total } = searchPropertySets("Wall");
    expect(total).toBeGreaterThan(0);
    expect(results.some((ps) => ps.name === "Pset_WallCommon")).toBe(true);
  });

  it("should support pagination", () => {
    const { results, total, hasMore } = searchPropertySets("Pset", 5, 0);
    expect(total).toBeGreaterThan(5);
    expect(results.length).toBeLessThanOrEqual(5);
    expect(hasMore).toBe(true);
  });

  it("should return empty for unknown query", () => {
    const { results, total } = searchPropertySets("xyzzynotexist");
    expect(results.length).toBe(0);
    expect(total).toBe(0);
  });
});

// ── Inheritance ─────────────────────────────────────────

describe("getInheritanceTree", () => {
  it("should build a tree from IfcRoot", () => {
    const tree = getInheritanceTree("IfcRoot", 1);
    expect(tree).toBeDefined();
    expect(tree!.name).toBe("IfcRoot");
    expect(tree!.children.length).toBeGreaterThan(0);
  });

  it("should respect depth limit", () => {
    const tree = getInheritanceTree("IfcRoot", 1);
    // depth=1 means only direct children, no grandchildren
    for (const child of tree!.children) {
      expect(child.children.length).toBe(0);
    }
  });

  it("should return deeper tree with higher depth", () => {
    const tree = getInheritanceTree("IfcRoot", 3);
    const hasGrandchildren = tree!.children.some((c) => c.children.length > 0);
    expect(hasGrandchildren).toBe(true);
  });

  it("should return undefined for unknown entity", () => {
    expect(getInheritanceTree("NotAnEntity")).toBeUndefined();
  });
});

describe("getAncestorChain", () => {
  it("should return chain from IfcWall to IfcRoot", () => {
    const chain = getAncestorChain("IfcWall");
    expect(chain.length).toBeGreaterThan(1);
    expect(chain[0]).toBe("IfcWall");
    expect(chain[chain.length - 1]).toBe("IfcRoot");
  });

  it("should return [name] for IfcRoot (no ancestors)", () => {
    const chain = getAncestorChain("IfcRoot");
    expect(chain).toEqual(["IfcRoot"]);
  });

  it("should return empty for unknown entity", () => {
    expect(getAncestorChain("NotAnEntity")).toEqual([]);
  });
});
