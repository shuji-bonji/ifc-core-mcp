/**
 * ifc_get_propertyset - PropertySet定義の取得
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResponseFormat } from "../types.js";
import { CHARACTER_LIMIT, DEFAULT_LIMIT, MAX_LIMIT } from "../constants.js";
import { getPropertySetDescription, searchPropertySets } from "../services/schema-loader.js";

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
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_LIMIT)
      .default(DEFAULT_LIMIT)
      .describe("Max results for search mode"),
    offset: z.number().int().min(0).default(0).describe("Pagination offset for search mode"),
    response_format: z
      .nativeEnum(ResponseFormat)
      .default(ResponseFormat.MARKDOWN)
      .describe("Output format: 'markdown' or 'json'"),
  })
  .strict();

type Input = z.infer<typeof InputSchema>;

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
        const pset = getPropertySetDescription(params.name);

        if (!pset) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: PropertySet '${params.name}' not found. Use mode="search" with a keyword to find available PropertySets.`,
              },
            ],
            isError: true,
          };
        }

        if (params.response_format === ResponseFormat.JSON) {
          const output = {
            name: pset.name,
            layer: pset.layer,
            schema: pset.schema,
            shortDefinition: pset.shortDefinition,
            history: pset.history,
            sections: pset.sections,
          };
          const text = JSON.stringify(output, null, 2);
          return { content: [{ type: "text" as const, text }] };
        }

        // Markdown
        const lines: string[] = [];
        lines.push(`# ${pset.name}`);
        lines.push("");
        if (pset.shortDefinition) {
          lines.push(pset.shortDefinition);
          lines.push("");
        }
        lines.push(`- **Layer**: ${pset.layer} / ${pset.schema}`);
        lines.push("");

        // fullText contains the complete Markdown documentation
        if (pset.fullText) {
          // Remove the title line (already shown) and add the rest
          const bodyStart = pset.fullText.indexOf("\n");
          if (bodyStart !== -1) {
            lines.push(pset.fullText.substring(bodyStart + 1).trim());
          }
        }

        let text = lines.join("\n");
        if (text.length > CHARACTER_LIMIT) {
          text = text.slice(0, CHARACTER_LIMIT) + "\n\n...[truncated]";
        }

        return { content: [{ type: "text" as const, text }] };
      }

      // Search mode
      const { results, total, hasMore } = searchPropertySets(
        params.name,
        params.limit,
        params.offset,
      );

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No PropertySets found matching '${params.name}'.`,
            },
          ],
        };
      }

      if (params.response_format === ResponseFormat.JSON) {
        const output = {
          total,
          count: results.length,
          offset: params.offset,
          hasMore,
          ...(hasMore ? { nextOffset: params.offset + results.length } : {}),
          propertySets: results.map((ps) => ({
            name: ps.name,
            layer: ps.layer,
            schema: ps.schema,
            shortDefinition: ps.shortDefinition,
          })),
        };
        const text = JSON.stringify(output, null, 2);
        return { content: [{ type: "text" as const, text }] };
      }

      // Markdown
      const lines: string[] = [];
      lines.push(`# PropertySet Search: "${params.name}"`);
      lines.push("");
      lines.push(`Found **${total}** PropertySets (showing ${results.length})`);
      lines.push("");

      for (const ps of results) {
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

      let text = lines.join("\n");
      if (text.length > CHARACTER_LIMIT) {
        text = text.slice(0, CHARACTER_LIMIT) + "\n\n...[truncated]";
      }

      return { content: [{ type: "text" as const, text }] };
    },
  );
}
