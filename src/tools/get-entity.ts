/**
 * ifc_get_entity - エンティティの定義を取得（属性、継承、WHERE制約、説明文）
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResponseFormat, type DirectAttribute, type TypeRef } from "../types.js";
import { CHARACTER_LIMIT } from "../constants.js";
import {
  getEntity,
  getEntityDescription,
  getEntityFullDescription,
} from "../services/schema-loader.js";

const InputSchema = z
  .object({
    name: z
      .string()
      .min(1, "Entity name is required")
      .describe("IFC entity name (e.g. 'IfcWall', 'IfcBeam', 'IfcProject')"),
    include_inherited: z
      .boolean()
      .default(true)
      .describe("Include inherited attributes (default: true)"),
    include_inverse: z
      .boolean()
      .default(false)
      .describe("Include inverse attributes (default: false)"),
    include_description: z
      .boolean()
      .default(true)
      .describe("Include Markdown description text (default: true)"),
    response_format: z
      .nativeEnum(ResponseFormat)
      .default(ResponseFormat.MARKDOWN)
      .describe("Output format: 'markdown' or 'json'"),
  })
  .strict();

type Input = z.infer<typeof InputSchema>;

function typeRefToString(typeRef: TypeRef): string {
  switch (typeRef.kind) {
    case "entity":
    case "type":
    case "enum":
    case "select":
    case "named":
      return typeRef.name;
    case "simple":
      return typeRef.name.toUpperCase();
    case "aggregation":
      return `${typeRef.aggregationType.toUpperCase()} [${typeRef.bound1}:${typeRef.bound2 ?? "?"}] OF ${typeRefToString(typeRef.elementType)}`;
    case "unknown":
      return typeRef.raw;
  }
}

function formatAttribute(attr: DirectAttribute): string {
  const opt = attr.optional ? "OPTIONAL " : "";
  return `${attr.name} : ${opt}${typeRefToString(attr.type)}`;
}

export function registerGetEntity(server: McpServer): void {
  server.registerTool(
    "ifc_get_entity",
    {
      title: "Get IFC Entity Definition",
      description: `Get the complete definition of an IFC4.3 entity including attributes, inheritance, WHERE rules, and description.

Returns the entity's structural definition from the EXPRESS schema merged with the Markdown documentation.

Args:
  - name (string): IFC entity name (e.g. "IfcWall", "IfcBeam", "IfcProject")
  - include_inherited (boolean): Include attributes inherited from supertypes (default: true)
  - include_inverse (boolean): Include inverse relationship attributes (default: false)
  - include_description (boolean): Include Markdown description text (default: true)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Entity definition with attributes, types, inheritance chain, WHERE rules, and description.

Examples:
  - "IfcWall" → Wall entity with PredefinedType, supertype chain to IfcRoot
  - "IfcProject" → Project entity with global context attributes`,
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
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Entity '${params.name}' not found in IFC4.3 schema. Use ifc_search_entity to find available entities.`,
            },
          ],
          isError: true,
        };
      }

      const desc = getEntityDescription(entity.name);
      const fullDesc = params.include_description
        ? getEntityFullDescription(entity.name)
        : undefined;

      if (params.response_format === ResponseFormat.JSON) {
        const output: Record<string, unknown> = {
          name: entity.name,
          isAbstract: entity.isAbstract,
          supertype: entity.supertype,
          subtypes: entity.subtypes,
          ancestors: entity.ancestors,
          layer: desc?.layer,
          schema: desc?.schema,
          shortDefinition: desc?.shortDefinition,
          directAttributes: entity.directAttributes,
          whereRules: entity.whereRules,
        };
        if (params.include_inherited) {
          output.allAttributes = entity.allAttributes;
        }
        if (params.include_inverse) {
          output.inverseAttributes = entity.inverseAttributes;
        }
        if (fullDesc) {
          output.description = fullDesc.fullText;
        }

        let text = JSON.stringify(output, null, 2);
        if (text.length > CHARACTER_LIMIT) {
          text = text.slice(0, CHARACTER_LIMIT) + "\n...[truncated]";
        }
        return { content: [{ type: "text" as const, text }] };
      }

      // Markdown format
      const lines: string[] = [];
      const abstractTag = entity.isAbstract ? " _(ABSTRACT)_" : "";
      lines.push(`# ${entity.name}${abstractTag}`);
      lines.push("");

      // 説明文
      if (desc?.shortDefinition) {
        lines.push(desc.shortDefinition);
        lines.push("");
      }

      // メタ情報
      if (desc) {
        lines.push(`- **Layer**: ${desc.layer} / ${desc.schema}`);
      }
      if (entity.supertype) {
        lines.push(`- **Supertype**: ${entity.supertype}`);
      }
      if (entity.ancestors.length > 0) {
        lines.push(`- **Inheritance**: ${entity.name} → ${entity.ancestors.join(" → ")}`);
      }
      if (entity.subtypes.length > 0) {
        lines.push(`- **Subtypes**: ${entity.subtypes.join(", ")}`);
      }
      lines.push("");

      // Direct attributes
      lines.push("## Direct Attributes");
      lines.push("");
      if (entity.directAttributes.length === 0) {
        lines.push("_(no direct attributes)_");
      } else {
        for (const attr of entity.directAttributes) {
          lines.push(`- \`${formatAttribute(attr)}\``);
        }
      }
      lines.push("");

      // Inherited attributes
      if (
        params.include_inherited &&
        entity.allAttributes.length > entity.directAttributes.length
      ) {
        lines.push("## All Attributes (including inherited)");
        lines.push("");
        for (const attr of entity.allAttributes) {
          const isDirect = entity.directAttributes.some((d) => d.name === attr.name);
          const marker = isDirect ? "" : " _(inherited)_";
          lines.push(`- \`${formatAttribute(attr)}\`${marker}`);
        }
        lines.push("");
      }

      // Inverse attributes
      if (params.include_inverse && entity.inverseAttributes.length > 0) {
        lines.push("## Inverse Attributes");
        lines.push("");
        for (const inv of entity.inverseAttributes) {
          const bound = inv.bound2 ? `[${inv.bound1}:${inv.bound2}]` : `[${inv.bound1}:?]`;
          lines.push(
            `- \`${inv.name}\` : ${inv.aggregationType.toUpperCase()} ${bound} OF ${inv.entityReference}`,
          );
        }
        lines.push("");
      }

      // WHERE rules
      if (entity.whereRules.length > 0) {
        lines.push("## WHERE Rules");
        lines.push("");
        for (const rule of entity.whereRules) {
          lines.push(`### ${rule.name}`);
          lines.push(`\`\`\`express`);
          lines.push(rule.expression);
          lines.push(`\`\`\``);
          lines.push("");
        }
      }

      // 詳細説明文
      if (fullDesc?.sections) {
        const sectionsToShow = ["Attributes", "Formal Propositions", "Concepts"];
        for (const section of sectionsToShow) {
          if (fullDesc.sections[section]) {
            lines.push(`## ${section} (from documentation)`);
            lines.push("");
            lines.push(fullDesc.sections[section]);
            lines.push("");
          }
        }
      }

      // History
      if (desc?.history && desc.history.length > 0) {
        lines.push("## History");
        lines.push("");
        for (const h of desc.history) {
          lines.push(`- ${h}`);
        }
        lines.push("");
      }

      let text = lines.join("\n");
      if (text.length > CHARACTER_LIMIT) {
        text = text.slice(0, CHARACTER_LIMIT) + "\n\n...[truncated]";
      }

      return { content: [{ type: "text" as const, text }] };
    },
  );
}
