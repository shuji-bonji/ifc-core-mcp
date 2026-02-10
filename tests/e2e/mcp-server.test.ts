/**
 * MCP Server E2E テスト
 *
 * MCP SDK の Client + StdioClientTransport を使用して
 * 実際のサーバープロセスを起動し、4つのツールを検証する。
 *
 * 実際の機能検証で確認した内容を自動テスト化したもの。
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "../..");

// ── Setup / Teardown ────────────────────────────────────

let client: Client;
let transport: StdioClientTransport;

beforeAll(async () => {
  transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    cwd: PROJECT_ROOT,
    stderr: "pipe",
  });

  client = new Client({
    name: "e2e-test-client",
    version: "1.0.0",
  });

  await client.connect(transport);
}, 30000);

afterAll(async () => {
  await client?.close();
});

// ── Helper Types ────────────────────────────────────────

interface ToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

// ── Tests ───────────────────────────────────────────────

describe("MCP Server E2E", () => {
  // ── tools/list ──

  it("should list all 4 tools", async () => {
    const result = await client.listTools();
    const toolNames = result.tools.map((t) => t.name);
    expect(toolNames).toContain("ifc_search_entity");
    expect(toolNames).toContain("ifc_get_entity");
    expect(toolNames).toContain("ifc_get_inheritance");
    expect(toolNames).toContain("ifc_get_propertyset");
    expect(toolNames).toHaveLength(4);
  });

  it("should have proper annotations on all tools", async () => {
    const result = await client.listTools();
    for (const tool of result.tools) {
      expect(tool.annotations?.readOnlyHint).toBe(true);
      expect(tool.annotations?.destructiveHint).toBe(false);
      expect(tool.annotations?.idempotentHint).toBe(true);
    }
  });

  // ── ifc_search_entity ──

  describe("ifc_search_entity", () => {
    it("should search 'Wall' and find multiple results (JSON)", async () => {
      const result = (await client.callTool({
        name: "ifc_search_entity",
        arguments: { query: "Wall", limit: 20, response_format: "json" },
      })) as ToolResult;

      const data = JSON.parse(result.content[0].text);
      expect(data.total).toBeGreaterThanOrEqual(10);
      expect(data.count).toBeGreaterThan(0);
      // IfcWall should be found somewhere in the results
      expect(data.entities.some((e: { name: string }) => e.name === "IfcWall")).toBe(true);
    });

    it("should return Markdown format by default", async () => {
      const result = (await client.callTool({
        name: "ifc_search_entity",
        arguments: { query: "IfcWall", limit: 5 },
      })) as ToolResult;

      const text = result.content[0].text;
      expect(text).toContain("# IFC Entity Search");
      expect(text).toContain("IfcWall");
    });

    it("should support pagination with offset", async () => {
      const page1 = (await client.callTool({
        name: "ifc_search_entity",
        arguments: { query: "Ifc", limit: 3, offset: 0, response_format: "json" },
      })) as ToolResult;

      const page2 = (await client.callTool({
        name: "ifc_search_entity",
        arguments: { query: "Ifc", limit: 3, offset: 3, response_format: "json" },
      })) as ToolResult;

      const data1 = JSON.parse(page1.content[0].text);
      const data2 = JSON.parse(page2.content[0].text);
      expect(data1.entities[0].name).not.toBe(data2.entities[0].name);
    });

    it("should return empty for non-existent query", async () => {
      const result = (await client.callTool({
        name: "ifc_search_entity",
        arguments: { query: "xyzzynotexist" },
      })) as ToolResult;

      expect(result.content[0].text).toContain("No IFC entities found");
    });
  });

  // ── ifc_get_entity ──

  describe("ifc_get_entity", () => {
    it("should get full IfcWall definition in Markdown", async () => {
      const result = (await client.callTool({
        name: "ifc_get_entity",
        arguments: { name: "IfcWall" },
      })) as ToolResult;

      const text = result.content[0].text;
      expect(text).toContain("# IfcWall");
      expect(text).toContain("PredefinedType");
      expect(text).toContain("IfcBuiltElement");
      expect(text).toContain("Direct Attributes");
      expect(text).toContain("All Attributes");
    });

    it("should get IfcWall definition in JSON with full structure", async () => {
      const result = (await client.callTool({
        name: "ifc_get_entity",
        arguments: { name: "IfcWall", response_format: "json" },
      })) as ToolResult;

      const data = JSON.parse(result.content[0].text);
      expect(data.name).toBe("IfcWall");
      expect(data.isAbstract).toBe(false);
      expect(data.supertype).toBe("IfcBuiltElement");
      expect(data.directAttributes).toBeDefined();
      expect(data.allAttributes).toBeDefined();
      expect(data.ancestors).toContain("IfcRoot");
      expect(data.whereRules).toBeDefined();

      // Check PredefinedType attribute exists
      const predType = data.directAttributes.find(
        (a: { name: string }) => a.name === "PredefinedType",
      );
      expect(predType).toBeDefined();
    });

    it("should include inverse attributes when requested", async () => {
      const result = (await client.callTool({
        name: "ifc_get_entity",
        arguments: { name: "IfcWall", include_inverse: true, response_format: "json" },
      })) as ToolResult;

      const data = JSON.parse(result.content[0].text);
      expect(data.inverseAttributes).toBeDefined();
      expect(Array.isArray(data.inverseAttributes)).toBe(true);
    });

    it("should exclude description when not requested", async () => {
      const result = (await client.callTool({
        name: "ifc_get_entity",
        arguments: {
          name: "IfcWall",
          include_description: false,
          response_format: "json",
        },
      })) as ToolResult;

      const data = JSON.parse(result.content[0].text);
      expect(data.description).toBeUndefined();
    });

    it("should return error for unknown entity", async () => {
      const result = (await client.callTool({
        name: "ifc_get_entity",
        arguments: { name: "IfcNotExist" },
      })) as ToolResult;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("not found");
    });

    it("should show abstract tag for abstract entities", async () => {
      const result = (await client.callTool({
        name: "ifc_get_entity",
        arguments: { name: "IfcRoot" },
      })) as ToolResult;

      expect(result.content[0].text).toContain("ABSTRACT");
    });

    it("should get IfcProject with global context attributes", async () => {
      const result = (await client.callTool({
        name: "ifc_get_entity",
        arguments: { name: "IfcProject", response_format: "json" },
      })) as ToolResult;

      const data = JSON.parse(result.content[0].text);
      expect(data.name).toBe("IfcProject");
      expect(data.allAttributes.length).toBeGreaterThan(0);
    });
  });

  // ── ifc_get_inheritance ──

  describe("ifc_get_inheritance", () => {
    it("should show IfcElement ancestors and descendants", async () => {
      const result = (await client.callTool({
        name: "ifc_get_inheritance",
        arguments: { name: "IfcElement", direction: "both", depth: 2 },
      })) as ToolResult;

      const text = result.content[0].text;
      expect(text).toContain("Ancestor Chain");
      expect(text).toContain("Descendant Tree");
      expect(text).toContain("IfcRoot");
    });

    it("should get ancestors only in JSON", async () => {
      const result = (await client.callTool({
        name: "ifc_get_inheritance",
        arguments: { name: "IfcWall", direction: "ancestors", response_format: "json" },
      })) as ToolResult;

      const data = JSON.parse(result.content[0].text);
      expect(data.ancestors).toBeDefined();
      expect(data.ancestors).toContain("IfcRoot");
      expect(data.descendantTree).toBeUndefined();
    });

    it("should get descendants only with depth control", async () => {
      const result = (await client.callTool({
        name: "ifc_get_inheritance",
        arguments: {
          name: "IfcProduct",
          direction: "descendants",
          depth: 1,
          response_format: "json",
        },
      })) as ToolResult;

      const data = JSON.parse(result.content[0].text);
      expect(data.descendantTree).toBeDefined();
      expect(data.descendantTree.children.length).toBeGreaterThan(0);
      expect(data.ancestors).toBeUndefined();

      // depth=1 → no grandchildren
      for (const child of data.descendantTree.children) {
        expect(child.children).toHaveLength(0);
      }
    });

    it("should return error for unknown entity", async () => {
      const result = (await client.callTool({
        name: "ifc_get_inheritance",
        arguments: { name: "IfcNotExist" },
      })) as ToolResult;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("not found");
    });
  });

  // ── ifc_get_propertyset ──

  describe("ifc_get_propertyset", () => {
    it("should get Pset_WallCommon in get mode (Markdown)", async () => {
      const result = (await client.callTool({
        name: "ifc_get_propertyset",
        arguments: { name: "Pset_WallCommon", mode: "get" },
      })) as ToolResult;

      const text = result.content[0].text;
      expect(text).toContain("Pset_WallCommon");
      expect(text).toContain("Layer");
    });

    it("should get Pset_WallCommon in JSON", async () => {
      const result = (await client.callTool({
        name: "ifc_get_propertyset",
        arguments: { name: "Pset_WallCommon", mode: "get", response_format: "json" },
      })) as ToolResult;

      const data = JSON.parse(result.content[0].text);
      expect(data.name).toBe("Pset_WallCommon");
      expect(data.layer).toBeDefined();
      expect(data.schema).toBeDefined();
    });

    it("should search PropertySets by keyword", async () => {
      const result = (await client.callTool({
        name: "ifc_get_propertyset",
        arguments: { name: "Wall", mode: "search", response_format: "json" },
      })) as ToolResult;

      const data = JSON.parse(result.content[0].text);
      expect(data.total).toBeGreaterThan(0);
      expect(data.propertySets.some((ps: { name: string }) => ps.name === "Pset_WallCommon")).toBe(
        true,
      );
    });

    it("should return error for unknown PropertySet in get mode", async () => {
      const result = (await client.callTool({
        name: "ifc_get_propertyset",
        arguments: { name: "Pset_NotExist", mode: "get" },
      })) as ToolResult;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("not found");
    });

    it("should support search with pagination", async () => {
      const result = (await client.callTool({
        name: "ifc_get_propertyset",
        arguments: {
          name: "Pset",
          mode: "search",
          limit: 3,
          offset: 0,
          response_format: "json",
        },
      })) as ToolResult;

      const data = JSON.parse(result.content[0].text);
      expect(data.count).toBeLessThanOrEqual(3);
      expect(data.hasMore).toBe(true);
      expect(data.total).toBeGreaterThan(3);
    });

    it("should return empty for unknown search query", async () => {
      const result = (await client.callTool({
        name: "ifc_get_propertyset",
        arguments: { name: "xyzzynotexist", mode: "search" },
      })) as ToolResult;

      expect(result.content[0].text).toContain("No PropertySets found");
    });
  });
});
