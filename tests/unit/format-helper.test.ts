/**
 * format-helper.ts ユニットテスト
 */

import { describe, it, expect } from "vitest";
import {
  typeRefToString,
  formatAttribute,
  buildPaginationMeta,
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
