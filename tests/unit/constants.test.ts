/**
 * constants.ts ユニットテスト
 */

import { describe, it, expect } from "vitest";
import {
  CHARACTER_LIMIT,
  TRUNCATION_SUFFIX,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  SERVER_NAME,
  SERVER_VERSION,
  DATA_DIR_RELATIVE,
  SCHEMA_FILE,
  DESC_INDEX_FILE,
  DESC_FULL_FILE,
  PSET_DEFS_FILE,
  ENTITY_DOC_SECTIONS,
  SCHEMA_ID_DEV_PATTERN,
  SCHEMA_ID_RELEASE,
} from "../../src/constants.js";

describe("constants", () => {
  it("should have a reasonable CHARACTER_LIMIT", () => {
    expect(CHARACTER_LIMIT).toBeGreaterThan(0);
    expect(CHARACTER_LIMIT).toBe(25000);
  });

  it("should have a truncation suffix", () => {
    expect(TRUNCATION_SUFFIX).toContain("truncated");
  });

  it("should have valid pagination limits", () => {
    expect(DEFAULT_LIMIT).toBe(20);
    expect(MAX_LIMIT).toBe(100);
    expect(DEFAULT_LIMIT).toBeLessThanOrEqual(MAX_LIMIT);
  });

  it("should have server name and version", () => {
    expect(SERVER_NAME).toBeDefined();
    expect(SERVER_NAME.length).toBeGreaterThan(0);
    expect(SERVER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("should have data file paths defined", () => {
    expect(DATA_DIR_RELATIVE).toBeDefined();
    expect(SCHEMA_FILE).toMatch(/\.json$/);
    expect(DESC_INDEX_FILE).toMatch(/\.json$/);
    expect(DESC_FULL_FILE).toMatch(/\.json$/);
    expect(PSET_DEFS_FILE).toMatch(/\.json$/);
  });

  it("should have schema ID normalization constants", () => {
    expect(SCHEMA_ID_DEV_PATTERN).toBeInstanceOf(RegExp);
    expect(SCHEMA_ID_RELEASE).toBe("IFC4X3_ADD2");
    // パターンが開発版 ID にマッチすることを確認
    expect("IFC4X3_DEV_923b0514".match(SCHEMA_ID_DEV_PATTERN)).toBeTruthy();
    // リリース版にはマッチしないことを確認
    expect("IFC4X3_ADD2".match(SCHEMA_ID_DEV_PATTERN)).toBeNull();
  });

  it("should have entity doc sections", () => {
    expect(ENTITY_DOC_SECTIONS.length).toBeGreaterThan(0);
    expect(ENTITY_DOC_SECTIONS).toContain("Attributes");
  });
});
