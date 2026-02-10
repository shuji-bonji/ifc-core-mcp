/**
 * ifc_get_entity - エンティティの定義を取得（属性、継承、WHERE制約、説明文）
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResponseFormat, type DirectAttribute } from "../types.js";
import { ENTITY_DOC_SECTIONS } from "../constants.js";
import {
  getEntity,
  getEntityDescription,
  getEntityFullDescription,
} from "../services/schema-loader.js";
import { responseFormatSchema } from "../utils/zod-schemas.js";
import {
  createTextResponse,
  createJsonResponse,
  createNotFoundError,
} from "../utils/response-helper.js";
import { formatAttribute } from "../utils/format-helper.js";

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
    response_format: responseFormatSchema,
  })
  .strict();

type Input = z.infer<typeof InputSchema>;

// ── Markdown 組み立て用ヘルパー ─────────────────────

/**
 * エンティティのメタ情報セクションを組み立てる。
 */
function buildMetaSection(
  entity: { name: string; supertype: string | null; ancestors: string[]; subtypes: string[] },
  desc?: { layer: string; schema: string },
): string[] {
  const lines: string[] = [];
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
  return lines;
}

/**
 * 直接属性セクションを組み立てる。
 */
function buildDirectAttributesSection(attrs: DirectAttribute[]): string[] {
  const lines = ["## Direct Attributes", ""];
  if (attrs.length === 0) {
    lines.push("_(no direct attributes)_");
  } else {
    for (const attr of attrs) {
      lines.push(`- \`${formatAttribute(attr)}\``);
    }
  }
  return lines;
}

/**
 * 全属性（継承含む）セクションを組み立てる。
 * directNames を Set で受け取り O(1) ルックアップにする。
 */
function buildAllAttributesSection(
  allAttrs: DirectAttribute[],
  directNames: Set<string>,
): string[] {
  const lines = ["## All Attributes (including inherited)", ""];
  for (const attr of allAttrs) {
    const marker = directNames.has(attr.name) ? "" : " _(inherited)_";
    lines.push(`- \`${formatAttribute(attr)}\`${marker}`);
  }
  return lines;
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
        return createNotFoundError(
          "Entity",
          params.name,
          "Use ifc_search_entity to find available entities.",
        );
      }

      const desc = getEntityDescription(entity.name);
      const fullDesc = params.include_description
        ? getEntityFullDescription(entity.name)
        : undefined;

      // ── JSON format ──
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
        return createJsonResponse(output);
      }

      // ── Markdown format ──
      const lines: string[] = [];
      const abstractTag = entity.isAbstract ? " _(ABSTRACT)_" : "";
      lines.push(`# ${entity.name}${abstractTag}`, "");

      // 説明文
      if (desc?.shortDefinition) {
        lines.push(desc.shortDefinition, "");
      }

      // メタ情報
      lines.push(...buildMetaSection(entity, desc), "");

      // Direct attributes
      lines.push(...buildDirectAttributesSection(entity.directAttributes), "");

      // Inherited attributes（直接属性との差分がある場合のみ表示）
      if (
        params.include_inherited &&
        entity.allAttributes.length > entity.directAttributes.length
      ) {
        const directNames = new Set(entity.directAttributes.map((d) => d.name));
        lines.push(...buildAllAttributesSection(entity.allAttributes, directNames), "");
      }

      // Inverse attributes
      if (params.include_inverse && entity.inverseAttributes.length > 0) {
        lines.push("## Inverse Attributes", "");
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
        lines.push("## WHERE Rules", "");
        for (const rule of entity.whereRules) {
          lines.push(`### ${rule.name}`, "```express", rule.expression, "```", "");
        }
      }

      // 詳細説明文（定数から取得するセクション名）
      if (fullDesc?.sections) {
        for (const section of ENTITY_DOC_SECTIONS) {
          if (fullDesc.sections[section]) {
            lines.push(`## ${section} (from documentation)`, "", fullDesc.sections[section], "");
          }
        }
      }

      // History
      if (desc?.history && desc.history.length > 0) {
        lines.push("## History", "");
        for (const h of desc.history) {
          lines.push(`- ${h}`);
        }
        lines.push("");
      }

      return createTextResponse(lines.join("\n"));
    },
  );
}
