// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  // ── 無視パターン ──
  {
    ignores: ["dist/", "node_modules/", "data/", "scripts/", "coverage/"],
  },

  // ── 基本ルール ──
  eslint.configs.recommended,

  // ── TypeScript ──
  ...tseslint.configs.recommended,

  // ── Prettier との競合解消 ──
  prettierConfig,

  // ── プロジェクト固有の設定 ──
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      // TypeScript
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // General
      "no-console": ["warn", { allow: ["error", "warn"] }],
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
    },
  },

  // ── テストファイル用の緩和設定 ──
  {
    files: ["tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);
