#!/usr/bin/env node
/**
 * IFC Core MCP Server
 *
 * IFC4.3 仕様リファレンス MCP サーバー。
 * AIがIFCのエンティティ定義・属性・継承関係・PropertySetを
 * 「判断の根拠」として参照するためのサーバー。
 *
 * Transport: stdio (local integration)
 * serveStdio は最初のメッセージでプロトコル版（2025 系 / 2026-07-28）を判定し、
 * createServer() で作った 1 インスタンスを接続の間固定する。
 */

import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { SERVER_NAME, SERVER_VERSION } from './constants.js';
import { createServer } from './server.js';
import { initialize } from './services/schema-loader.js';

function main(): void {
	// データロードはプロセスで 1 回だけ
	initialize();

	const handle = serveStdio(createServer, {
		onerror: (error) => console.error(`[${SERVER_NAME}] stdio error:`, error.message),
	});

	const shutdown = (): void => {
		void handle.close().finally(() => process.exit(0));
	};
	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);

	console.error(`[${SERVER_NAME}] v${SERVER_VERSION} running via stdio`);
}

try {
	main();
} catch (error: unknown) {
	console.error('Server error:', error);
	process.exit(1);
}
