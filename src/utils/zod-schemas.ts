/**
 * 共通 Zod スキーマ
 *
 * 各ツールで繰り返し定義されるパラメータスキーマを一元化する。
 */

import { z } from "zod";
import { ResponseFormat } from "../types.js";
import { DEFAULT_LIMIT, MAX_LIMIT } from "../constants.js";

/** レスポンス形式パラメータ */
export const responseFormatSchema = z
  .nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'markdown' for human-readable or 'json' for structured data");

/** ページネーション: limit パラメータ */
export const limitSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_LIMIT)
  .default(DEFAULT_LIMIT)
  .describe("Maximum results to return");

/** ページネーション: offset パラメータ */
export const offsetSchema = z
  .number()
  .int()
  .min(0)
  .default(0)
  .describe("Number of results to skip for pagination");
