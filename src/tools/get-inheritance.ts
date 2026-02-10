/**
 * ifc_get_inheritance - エンティティの継承ツリーを取得
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResponseFormat } from "../types.js";
import {
  getEntity,
  getInheritanceTree,
  getAncestorChain,
  type InheritanceNode,
} from "../services/schema-loader.js";
import { responseFormatSchema } from "../utils/zod-schemas.js";
import { createTextResponse, createNotFoundError } from "../utils/response-helper.js";

const InputSchema = z
  .object({
    name: z
      .string()
      .min(1, "Entity name is required")
      .describe("IFC entity name (e.g. 'IfcRoot', 'IfcProduct', 'IfcWall')"),
    direction: z
      .enum(["descendants", "ancestors", "both"])
      .default("both")
      .describe("Direction: 'descendants' (subtypes), 'ancestors' (supertypes), or 'both'"),
    depth: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(3)
      .describe("Maximum depth for descendant tree (default: 3)"),
    response_format: responseFormatSchema,
  })
  .strict();

type Input = z.infer<typeof InputSchema>;

/**
 * 継承ツリーをインデント付き Markdown リストに変換する。
 */
function treeToMarkdown(node: InheritanceNode, indent: number = 0): string[] {
  const lines: string[] = [];
  const prefix = "  ".repeat(indent);
  const abstractTag = node.isAbstract ? " _(abstract)_" : "";
  lines.push(`${prefix}- **${node.name}**${abstractTag}`);
  for (const child of node.children) {
    lines.push(...treeToMarkdown(child, indent + 1));
  }
  return lines;
}

export function registerGetInheritance(server: McpServer): void {
  server.registerTool(
    "ifc_get_inheritance",
    {
      title: "Get IFC Inheritance Tree",
      description: `Get the inheritance hierarchy of an IFC4.3 entity.

Shows ancestor chain (supertypes up to IfcRoot) and/or descendant tree (subtypes).

Args:
  - name (string): IFC entity name (e.g. "IfcRoot", "IfcProduct", "IfcWall")
  - direction ('descendants' | 'ancestors' | 'both'): Which direction to show (default: 'both')
  - depth (number): Max depth for descendant tree, 1-10 (default: 3)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Inheritance hierarchy showing ancestors and/or descendants.

Examples:
  - "IfcRoot" with direction="descendants" → full class hierarchy tree
  - "IfcWall" with direction="ancestors" → IfcWall → IfcBuiltElement → ... → IfcRoot
  - "IfcProduct" with direction="both" → both ancestor chain and subtype tree`,
      inputSchema: InputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: Input) => {
      const entity = getEntity(params.name);

      if (!entity) {
        return createNotFoundError(
          "Entity",
          params.name,
          "Use ifc_search_entity to find available entities.",
        );
      }

      const showAncestors = params.direction === "ancestors" || params.direction === "both";
      const showDescendants = params.direction === "descendants" || params.direction === "both";

      const ancestors = showAncestors ? getAncestorChain(entity.name) : [];
      const tree = showDescendants ? getInheritanceTree(entity.name, params.depth) : undefined;

      if (params.response_format === ResponseFormat.JSON) {
        const output: Record<string, unknown> = {
          name: entity.name,
          isAbstract: entity.isAbstract,
        };
        if (showAncestors) output.ancestors = ancestors;
        if (tree) output.descendantTree = tree;

        const text = JSON.stringify(output, null, 2);
        return { content: [{ type: "text" as const, text }] };
      }

      // Markdown format
      const lines: string[] = [];
      lines.push(`# Inheritance: ${entity.name}`, "");

      if (showAncestors && ancestors.length > 1) {
        lines.push("## Ancestor Chain (→ supertype)", "", `\`${ancestors.join(" → ")}\``, "");
      }

      if (tree) {
        lines.push("## Descendant Tree (subtypes)", "", ...treeToMarkdown(tree), "");
      }

      return createTextResponse(lines.join("\n"));
    },
  );
}
