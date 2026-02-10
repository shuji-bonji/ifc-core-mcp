/**
 * response-helper.ts ユニットテスト
 */

import { describe, it, expect } from "vitest";
import {
  truncateText,
  createTextResponse,
  createJsonResponse,
  createErrorResponse,
  createNotFoundError,
} from "../../src/utils/response-helper.js";
import { CHARACTER_LIMIT } from "../../src/constants.js";

describe("truncateText", () => {
  it("should return text as-is when under limit", () => {
    const text = "short text";
    expect(truncateText(text)).toBe(text);
  });

  it("should truncate text exceeding the limit", () => {
    const text = "a".repeat(CHARACTER_LIMIT + 100);
    const result = truncateText(text);
    expect(result.length).toBeLessThan(text.length);
    expect(result).toContain("truncated");
  });

  it("should respect custom limit", () => {
    const text = "a".repeat(50);
    const result = truncateText(text, 10);
    expect(result).toContain("truncated");
  });
});

describe("createTextResponse", () => {
  it("should wrap text in MCP response format", () => {
    const response = createTextResponse("hello");
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe("text");
    expect(response.content[0].text).toBe("hello");
    expect(response.isError).toBeUndefined();
  });
});

describe("createJsonResponse", () => {
  it("should serialize object to JSON", () => {
    const response = createJsonResponse({ name: "test", value: 42 });
    const parsed = JSON.parse(response.content[0].text);
    expect(parsed.name).toBe("test");
    expect(parsed.value).toBe(42);
  });
});

describe("createErrorResponse", () => {
  it("should set isError flag", () => {
    const response = createErrorResponse("something went wrong");
    expect(response.isError).toBe(true);
    expect(response.content[0].text).toBe("something went wrong");
  });
});

describe("createNotFoundError", () => {
  it("should generate standard not-found message", () => {
    const response = createNotFoundError("Entity", "IfcFoo", "Try searching instead.");
    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain("Entity");
    expect(response.content[0].text).toContain("IfcFoo");
    expect(response.content[0].text).toContain("not found");
    expect(response.content[0].text).toContain("Try searching instead.");
  });

  it("should work without hint", () => {
    const response = createNotFoundError("PropertySet", "Pset_X");
    expect(response.content[0].text).toContain("PropertySet");
    expect(response.content[0].text).toContain("Pset_X");
  });
});
