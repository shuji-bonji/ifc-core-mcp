/**
 * types.ts ユニットテスト
 *
 * ResponseFormat enumの値を検証する。
 */

import { describe, it, expect } from "vitest";
import { ResponseFormat } from "../../src/types.js";

describe("ResponseFormat enum", () => {
  it("should have MARKDOWN and JSON values", () => {
    expect(ResponseFormat.MARKDOWN).toBe("markdown");
    expect(ResponseFormat.JSON).toBe("json");
  });

  it("should have exactly 2 members", () => {
    const values = Object.values(ResponseFormat);
    expect(values).toHaveLength(2);
  });
});
