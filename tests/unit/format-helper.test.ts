/**
 * format-helper.ts ユニットテスト
 */

import { describe, it, expect } from "vitest";
import {
  typeRefToString,
  formatAttribute,
  buildPaginationMeta,
  calculateSearchScore,
  SEARCH_SCORE,
} from "../../src/utils/format-helper.js";

describe("typeRefToString", () => {
  it("should format simple type in uppercase", () => {
    expect(typeRefToString({ kind: "simple", name: "string" })).toBe("STRING");
  });

  it("should format entity type as-is", () => {
    expect(typeRefToString({ kind: "entity", name: "IfcWall" })).toBe("IfcWall");
  });

  it("should format aggregation type", () => {
    const result = typeRefToString({
      kind: "aggregation",
      aggregationType: "set",
      bound1: 0,
      bound2: null,
      elementType: { kind: "entity", name: "IfcProduct" },
    });
    expect(result).toBe("SET [0:?] OF IfcProduct");
  });

  it("should format unknown type", () => {
    expect(typeRefToString({ kind: "unknown", raw: "SOME_RAW" })).toBe("SOME_RAW");
  });
});

describe("formatAttribute", () => {
  it("should format required attribute", () => {
    const result = formatAttribute({
      name: "Name",
      type: { kind: "type", name: "IfcLabel" },
      optional: false,
    });
    expect(result).toBe("Name : IfcLabel");
  });

  it("should format optional attribute", () => {
    const result = formatAttribute({
      name: "Description",
      type: { kind: "type", name: "IfcText" },
      optional: true,
    });
    expect(result).toBe("Description : OPTIONAL IfcText");
  });
});

describe("buildPaginationMeta", () => {
  it("should include nextOffset when hasMore is true", () => {
    const meta = buildPaginationMeta(50, 10, 0, true);
    expect(meta.total).toBe(50);
    expect(meta.count).toBe(10);
    expect(meta.offset).toBe(0);
    expect(meta.hasMore).toBe(true);
    expect(meta.nextOffset).toBe(10);
  });

  it("should not include nextOffset when hasMore is false", () => {
    const meta = buildPaginationMeta(5, 5, 0, false);
    expect(meta.hasMore).toBe(false);
    expect(meta.nextOffset).toBeUndefined();
  });
});

describe("calculateSearchScore", () => {
  it("should return NAME_EXACT for exact name match (case-insensitive)", () => {
    expect(calculateSearchScore("IfcWall", undefined, "IfcWall")).toBe(SEARCH_SCORE.NAME_EXACT);
    expect(calculateSearchScore("IfcWall", undefined, "ifcwall")).toBe(SEARCH_SCORE.NAME_EXACT);
  });

  it("should return NAME_IFC_EXACT for Ifc+query exact match", () => {
    expect(calculateSearchScore("IfcWall", undefined, "Wall")).toBe(SEARCH_SCORE.NAME_IFC_EXACT);
    expect(calculateSearchScore("IfcWall", undefined, "wall")).toBe(SEARCH_SCORE.NAME_IFC_EXACT);
  });

  it("should return NAME_PREFIX for prefix match", () => {
    expect(calculateSearchScore("IfcWallStandardCase", undefined, "Wall")).toBe(
      SEARCH_SCORE.NAME_PREFIX,
    );
    expect(calculateSearchScore("IfcWallType", undefined, "wall")).toBe(SEARCH_SCORE.NAME_PREFIX);
  });

  it("should return NAME_CONTAINS for substring match", () => {
    expect(calculateSearchScore("IfcCurtainWall", undefined, "Wall")).toBe(
      SEARCH_SCORE.NAME_CONTAINS,
    );
  });

  it("should return DESCRIPTION_MATCH for description-only match", () => {
    expect(calculateSearchScore("IfcDoor", "A door in a wall partition", "wall")).toBe(
      SEARCH_SCORE.DESCRIPTION_MATCH,
    );
  });

  it("should return NO_MATCH when nothing matches", () => {
    expect(calculateSearchScore("IfcWall", "A wall element", "beam")).toBe(SEARCH_SCORE.NO_MATCH);
  });

  it("should prefer name match over description match", () => {
    const nameScore = calculateSearchScore("IfcCurtainWall", undefined, "Wall");
    const descScore = calculateSearchScore("IfcDoor", "A door in a wall partition", "Wall");
    expect(nameScore).toBeGreaterThan(descScore);
  });
});
