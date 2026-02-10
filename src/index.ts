#!/usr/bin/env node
/**
 * IFC Core MCP Server
 *
 * IFC4.3 仕様リファレンス MCP サーバー。
 * AIがIFCのエンティティ定義・属性・継承関係・PropertySetを
 * 「判断の根拠」として参照するためのサーバー。
 *
 * Transport: stdio (local integration)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SERVER_NAME, SERVER_VERSION } from "./constants.js";
import { initialize } from "./services/schema-loader.js";
import { registerSearchEntity } from "./tools/search-entity.js";
import { registerGetEntity } from "./tools/get-entity.js";
import { registerGetInheritance } from "./tools/get-inheritance.js";
import { registerGetPropertySet } from "./tools/get-propertyset.js";

// ── MCP Server 初期化 ─────────────────────────────────

const server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION,
});

// ── データロード ──────────────────────────────────────

initialize();

// ── ツール登録 ────────────────────────────────────────

registerSearchEntity(server);
registerGetEntity(server);
registerGetInheritance(server);
registerGetPropertySet(server);

// ── サーバー起動 ──────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[${SERVER_NAME}] v${SERVER_VERSION} running via stdio`);
}

main().catch((error: unknown) => {
  console.error("Server error:", error);
  process.exit(1);
});
