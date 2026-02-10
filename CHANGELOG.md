# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Shared utility modules (`utils/response-helper.ts`, `utils/format-helper.ts`, `utils/zod-schemas.ts`)
- Unit tests for utility modules (response-helper, format-helper)
- GitHub Actions CI workflow (lint, test, build)
- GitHub Actions publish workflow (npm publish on version tags)
- `prepublishOnly` script and `files` field in package.json
- `TRUNCATION_SUFFIX`, `DATA_DIR_RELATIVE`, `SCHEMA_FILE`, `DESC_INDEX_FILE`, `DESC_FULL_FILE`, `ENTITY_DOC_SECTIONS` constants
- README.md (English), README.ja.md (Japanese), CHANGELOG.md, LICENSE

### Changed

- Extracted hardcoded values into `constants.ts`
- Replaced duplicated truncation/response patterns with shared utilities
- Replaced duplicated Zod schema definitions with `zod-schemas.ts`
- Refactored `get-propertyset.ts`: split handler into `handleGetMode()` / `handleSearchMode()`
- Refactored `get-entity.ts`: extracted `buildMetaSection()`, `buildDirectAttributesSection()`, `buildAllAttributesSection()`
- Extracted `typeRefToString()` and `formatAttribute()` into `format-helper.ts`
- Used `SERVER_NAME` constant for log prefix in `schema-loader.ts` (was hardcoded `"[ifc-core-mcp]"`)

### Improved

- **Performance**: Changed direct attribute lookup from `.some()` (O(n²)) to `Set` (O(n)) in `get-entity.ts`
- **Performance**: Cached `Object.values()` result for PropertySet array in `schema-loader.ts` (avoid recomputation per search)
- **Maintainability**: Centralized response creation, error handling, and pagination meta generation
- **Testability**: Added 23 new unit tests for utilities (total: 86 tests)

## [0.1.0] - 2025-06-14

### Added

- Initial release
- 4 MCP tools: `ifc_search_entity`, `ifc_get_entity`, `ifc_get_inheritance`, `ifc_get_propertyset`
- Full IFC4.3 schema coverage (876 entities, 132 types, 243 enums, 61 selects)
- Dual output format support (Markdown / JSON)
- Pagination support with configurable limit/offset
- Pre-built data pipeline (Python + IfcOpenShell → JSON)
- TypeScript strict mode, Zod validation
- Unit tests + E2E integration tests with actual MCP client
- ESLint + Prettier configuration

[Unreleased]: https://github.com/shuji-bonji/ifc-core-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/shuji-bonji/ifc-core-mcp/releases/tag/v0.1.0
