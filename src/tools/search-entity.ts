/**
 * ifc_search_entity - エンティティ名や説明文のキーワードで検索
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResponseFormat } from "../types.js";
import { searchEntities, getEntityDescription } from "../services/schema-loader.js";
import { responseFormatSchema, limitSchema, offsetSchema } from "../utils/zod-schemas.js";
import { createTextResponse, createJsonResponse } from "../utils/response-helper.js";
import { buildPaginationMeta } from "../utils/format-helper.js";

const InputSchema = z
  .object({
    query: z
      .string()
      .min(2, "Query must be at least 2 characters")
      .max(200, "Query must not exceed 200 characters")
      .describe(
        "Search keyword to match against entity names or descriptions (e.g. 'Wall', 'beam', 'spatial')",
      ),
    limit: limitSchema,
    offset: offsetSchema,
    response_format: responseFormatSchema,
  })
  .strict();

type Input = z.infer<typeof InputSchema>;

/** ツール共通のアノテーション（読み取り専用・冪等） */
const TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export function registerSearchEntity(server: McpServer): void {
  server.registerTool(
    "ifc_search_entity",
    {
      title: "Search IFC Entities",
      description: `Search IFC4.3 entities by name or description keyword.

Returns matching entities with their name, layer, schema, and short definition.
Supports partial name matching and description text search.

Args:
  - query (string): Search keyword (e.g. "Wall", "beam", "spatial", "opening")
  - limit (number): Max results, 1-100 (default: 20)
  - offset (number): Pagination offset (default: 0)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  List of matching entities with name, layer, schema, and short definition.

Examples:
  - "Wall" → IfcWall, IfcWallType, IfcWallStandardCase, ...
  - "spatial" → IfcSpatialElement, IfcSpatialStructureElement, ...
  - "beam" → IfcBeam, IfcBeamType, IfcBeamStandardCase, ...`,
      inputSchema: InputSchema,
      annotations: TOOL_ANNOTATIONS,
    },
    async (params: Input) => {
      const { results, total, hasMore } = searchEntities(params.query, params.limit, params.offset);

      if (results.length === 0) {
        return createTextResponse(`No IFC entities found matching '${params.query}'.`);
      }

      const entities = results.map((e) => {
        const desc = getEntityDescription(e.name);
        return {
          name: e.name,
          isAbstract: e.isAbstract,
          supertype: e.supertype,
          layer: desc?.layer ?? "unknown",
          schema: desc?.schema ?? "unknown",
          shortDefinition: desc?.shortDefinition ?? "",
        };
      });

      if (params.response_format === ResponseFormat.JSON) {
        return createJsonResponse({
          ...buildPaginationMeta(total, results.length, params.offset, hasMore),
          entities,
        });
      }

      // Markdown format
      const lines = [
        `# IFC Entity Search: "${params.query}"`,
        "",
        `Found **${total}** entities (showing ${results.length}, offset ${params.offset})`,
        "",
      ];

      for (const e of entities) {
        const abstractTag = e.isAbstract ? " _(abstract)_" : "";
        lines.push(`## ${e.name}${abstractTag}`);
        lines.push(`- **Layer**: ${e.layer} / ${e.schema}`);
        if (e.supertype) lines.push(`- **Supertype**: ${e.supertype}`);
        if (e.shortDefinition) lines.push(`- ${e.shortDefinition}`);
        lines.push("");
      }

      if (hasMore) {
        lines.push(
          `_More results available. Use offset=${params.offset + results.length} to see next page._`,
        );
      }

      return createTextResponse(lines.join("\n"));
    },
  );
}
