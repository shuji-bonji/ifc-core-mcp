/**
 * IFC Core MCP Server - サーバー組み立て
 *
 * McpServer の生成とツール登録をここに集約する。
 * index.ts（stdio 起動）とテスト（InMemoryTransport 等）が同じ createServer() を使う。
 */

import { McpServer } from '@modelcontextprotocol/server';
import { SERVER_NAME, SERVER_VERSION } from './constants.js';
import { registerGetEntity } from './tools/get-entity.js';
import { registerGetInheritance } from './tools/get-inheritance.js';
import { registerGetPropertySet } from './tools/get-propertyset.js';
import { registerSearchEntity } from './tools/search-entity.js';

/**
 * `initialize` / `server/discover` の応答としてクライアントへ返す説明。
 * README やツール説明より早く（ツールを 1 つも呼ぶ前に）読まれるため、
 * 「しないこと」を先に書いて射程の誤解を断つ。
 *
 * - 「IFC ファイルを読める」と誤解されないよう、仕様リファレンスであることを明記する
 * - 検索で見つからない = 存在しない、と読まれないよう区別を書く
 */
const INSTRUCTIONS = `This server is a REFERENCE to the IFC4.3 (ISO 16739-1:2024) specification, not an IFC file tool.

It does NOT read, parse, validate, or write IFC/STEP/ifcJSON files. It has no access to any building model.
It only answers questions about the schema itself: entity definitions, attributes, inheritance, WHERE rules, and PropertySet (Pset_*) definitions.

A search that returns nothing means "this server cannot answer", NOT "no such entity exists". Try a shorter query or the exact IfcXxx name.

Responses default to Markdown; pass response_format: "json" for structured data. Long responses are truncated at the character limit.`;

/**
 * ツール登録済みの McpServer を生成する。
 * serveStdio は接続ごとにこの関数を 1 回呼ぶ。データのロードは含めない（プロセスで 1 回だけ行う）。
 */
export function createServer(): McpServer {
	const server = new McpServer(
		{ name: SERVER_NAME, version: SERVER_VERSION },
		{ instructions: INSTRUCTIONS }
	);

	registerSearchEntity(server);
	registerGetEntity(server);
	registerGetInheritance(server);
	registerGetPropertySet(server);

	return server;
}
