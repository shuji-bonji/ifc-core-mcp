/**
 * ifc_search_entity - エンティティ名や説明文のキーワードで検索
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResponseFormat } from "../types.js";
import { DEFAULT_LIMIT, MAX_LIMIT, CHARACTER_LIMIT } from "../constants.js";
import { searchEntities, getEntityDescription } from "../services/schema-loader.js";

const InputSchema = z
  .object({
    query: z
      .string()
      .min(2, "Query must be at least 2 characters")
      .max(200, "Query must not exceed 200 characters")
      .describe(
        "Search keyword to match against entity names or descriptions (e.g. 'Wall', 'beam', 'spatial')",
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_LIMIT)
      .default(DEFAULT_LIMIT)
      .describe("Maximum results to return"),
    offset: z.number().int().min(0).default(0).describe("Number of results to skip for pagination"),
    response_format: z
      .nativeEnum(ResponseFormat)
      .default(ResponseFormat.MARKDOWN)
      .describe("Output format: 'markdown' for human-readable or 'json' for structured data"),
  })
  .strict();

type Input = z.infer<typeof InputSchema>;

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
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: Input) => {
      const { results, total, hasMore } = searchEntities(params.query, params.limit, params.offset);

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No IFC entities found matching '${params.query}'.`,
            },
          ],
        };
      }

      const output = {
        total,
        count: results.length,
        offset: params.offset,
        hasMore,
        ...(hasMore ? { nextOffset: params.offset + results.length } : {}),
        entities: results.map((e) => {
          const desc = getEntityDescription(e.name);
          return {
            name: e.name,
            isAbstract: e.isAbstract,
            supertype: e.supertype,
            layer: desc?.layer ?? "unknown",
            schema: desc?.schema ?? "unknown",
            shortDefinition: desc?.shortDefinition ?? "",
          };
        }),
      };

      let text: string;
      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines = [
          `# IFC Entity Search: "${params.query}"`,
          "",
          `Found **${total}** entities (showing ${results.length}, offset ${params.offset})`,
          "",
        ];
        for (const e of output.entities) {
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
        text = lines.join("\n");
      } else {
        text = JSON.stringify(output, null, 2);
      }

      if (text.length > CHARACTER_LIMIT) {
        text = text.slice(0, CHARACTER_LIMIT) + "\n\n...[truncated]";
      }

      return {
        content: [{ type: "text" as const, text }],
      };
    },
  );
}
