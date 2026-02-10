/**
 * constants.ts ユニットテスト
 */

import { describe, it, expect } from "vitest";
import {
  CHARACTER_LIMIT,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  SERVER_NAME,
  SERVER_VERSION,
} from "../../src/constants.js";

describe("constants", () => {
  it("should have a reasonable CHARACTER_LIMIT", () => {
    expect(CHARACTER_LIMIT).toBeGreaterThan(0);
    expect(CHARACTER_LIMIT).toBe(25000);
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
});
