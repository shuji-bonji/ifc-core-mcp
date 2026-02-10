/**
 * ifc_get_propertyset - PropertySet定義の取得
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResponseFormat } from "../types.js";
import { getPropertySetDescription, searchPropertySets } from "../services/schema-loader.js";
import { responseFormatSchema, limitSchema, offsetSchema } from "../utils/zod-schemas.js";
import {
  createTextResponse,
  createJsonResponse,
  createNotFoundError,
} from "../utils/response-helper.js";
import { buildPaginationMeta } from "../utils/format-helper.js";

const InputSchema = z
  .object({
    name: z
      .string()
      .min(1, "PropertySet name or search query is required")
      .describe(
        "PropertySet name (e.g. 'Pset_WallCommon') or search keyword (e.g. 'Wall', 'thermal')",
      ),
    mode: z
      .enum(["get", "search"])
      .default("get")
      .describe("Mode: 'get' for exact name lookup, 'search' for keyword search"),
    limit: limitSchema,
    offset: offsetSchema,
    response_format: responseFormatSchema,
  })
  .strict();

type Input = z.infer<typeof InputSchema>;

// ── get モード: 単一 PropertySet の取得 ─────────────

function handleGetMode(params: Input) {
  const pset = getPropertySetDescription(params.name);

  if (!pset) {
    return createNotFoundError(
      "PropertySet",
      params.name,
      'Use mode="search" with a keyword to find available PropertySets.',
    );
  }

  if (params.response_format === ResponseFormat.JSON) {
    return createJsonResponse({
      name: pset.name,
      layer: pset.layer,
      schema: pset.schema,
      shortDefinition: pset.shortDefinition,
      history: pset.history,
      sections: pset.sections,
    });
  }

  // Markdown
  const lines: string[] = [];
  lines.push(`# ${pset.name}`, "");
  if (pset.shortDefinition) {
    lines.push(pset.shortDefinition, "");
  }
  lines.push(`- **Layer**: ${pset.layer} / ${pset.schema}`, "");

  // fullText にはタイトル行が含まれるので除去して本文のみ追加
  if (pset.fullText) {
    const bodyStart = pset.fullText.indexOf("\n");
    if (bodyStart !== -1) {
      lines.push(pset.fullText.substring(bodyStart + 1).trim());
    }
  }

  return createTextResponse(lines.join("\n"));
}

// ── search モード: キーワード検索 ───────────────────

function handleSearchMode(params: Input) {
  const { results, total, hasMore } = searchPropertySets(params.name, params.limit, params.offset);

  if (results.length === 0) {
    return createTextResponse(`No PropertySets found matching '${params.name}'.`);
  }

  const propertySets = results.map((ps) => ({
    name: ps.name,
    layer: ps.layer,
    schema: ps.schema,
    shortDefinition: ps.shortDefinition,
  }));

  if (params.response_format === ResponseFormat.JSON) {
    return createJsonResponse({
      ...buildPaginationMeta(total, results.length, params.offset, hasMore),
      propertySets,
    });
  }

  // Markdown
  const lines: string[] = [];
  lines.push(`# PropertySet Search: "${params.name}"`, "");
  lines.push(`Found **${total}** PropertySets (showing ${results.length})`, "");

  for (const ps of propertySets) {
    lines.push(`## ${ps.name}`);
    lines.push(`- **Layer**: ${ps.layer} / ${ps.schema}`);
    if (ps.shortDefinition) lines.push(`- ${ps.shortDefinition}`);
    lines.push("");
  }

  if (hasMore) {
    lines.push(
      `_More results available. Use offset=${params.offset + results.length} to see next page._`,
    );
  }

  return createTextResponse(lines.join("\n"));
}

// ── ツール登録 ──────────────────────────────────────

export function registerGetPropertySet(server: McpServer): void {
  server.registerTool(
    "ifc_get_propertyset",
    {
      title: "Get IFC PropertySet Definition",
      description: `Get or search IFC4.3 PropertySet definitions.

In 'get' mode, retrieves the full definition of a named PropertySet.
In 'search' mode, searches PropertySets by keyword.

Args:
  - name (string): PropertySet name (e.g. "Pset_WallCommon") or search keyword
  - mode ('get' | 'search'): Lookup mode (default: 'get')
  - limit (number): Max results for search mode (default: 20)
  - offset (number): Pagination offset for search mode (default: 0)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  PropertySet definition with properties and descriptions.

Examples:
  - name="Pset_WallCommon", mode="get" → Full PropertySet definition
  - name="Wall", mode="search" → All PropertySets related to walls
  - name="thermal", mode="search" → PropertySets with thermal properties`,
      inputSchema: InputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: Input) => {
      if (params.mode === "get") {
        return handleGetMode(params);
      }
      return handleSearchMode(params);
    },
  );
}
