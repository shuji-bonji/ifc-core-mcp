# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2025-02-11

### Added

- **PropertySet property definitions**: `ifc_get_propertyset` now returns individual property names, data types, IFC types, and value kinds (746 PropertySets, 3866 properties)
- PropertySet property definition build script (`scripts/build_propertyset_defs.mjs`)
- Generated data file: `data/generated/ifc4x3-propertyset-defs.json`
- Search scoring system (`calculateSearchScore()`, `SEARCH_SCORE` constants in `format-helper.ts`)
- Schema ID normalization constants (`SCHEMA_ID_DEV_PATTERN`, `SCHEMA_ID_RELEASE`)
- `PSET_DEFS_FILE` constant for PropertySet definitions file path
- PropertySet property type definitions (`PropertySetProperty`, `PropertySetDefinition`, `PropertySetDefsData`)
- 16 new unit tests (total: 102 tests)
- Shared utility modules (`utils/response-helper.ts`, `utils/format-helper.ts`, `utils/zod-schemas.ts`)
- Unit tests for utility modules (response-helper, format-helper)
- GitHub Actions CI workflow (lint, test, build)
- GitHub Actions publish workflow (npm publish on version tags)
- `prepublishOnly` script and `files` field in package.json
- `TRUNCATION_SUFFIX`, `DATA_DIR_RELATIVE`, `SCHEMA_FILE`, `DESC_INDEX_FILE`, `DESC_FULL_FILE`, `ENTITY_DOC_SECTIONS` constants
- README.md (English), README.ja.md (Japanese), CHANGELOG.md, LICENSE

### Changed

- **Search ranking**: `ifc_search_entity` and `searchPropertySets` now sort results by relevance score (exact name match > Ifc+name match > prefix match > substring match > description match)
- **WHERE rule normalization**: Development schema IDs (`IFC4X3_DEV_*`) are normalized to release ID (`IFC4X3_ADD2`) at load time (199 rules affected)
- `ifc_get_propertyset` (get mode) now includes property table, applicable entities, and structured description section
- `ifc_get_propertyset` (search mode) now includes property count per PropertySet
- CI `test` job now builds before running tests (fixes E2E test failure in CI)
- Extracted hardcoded values into `constants.ts`
- Replaced duplicated truncation/response patterns with shared utilities
- Replaced duplicated Zod schema definitions with `zod-schemas.ts`
- Refactored `get-propertyset.ts`: split handler into `handleGetMode()` / `handleSearchMode()`
- Refactored `get-entity.ts`: extracted `buildMetaSection()`, `buildDirectAttributesSection()`, `buildAllAttributesSection()`
- Extracted `typeRefToString()` and `formatAttribute()` into `format-helper.ts`
- Used `SERVER_NAME` constant for log prefix in `schema-loader.ts` (was hardcoded `"[ifc-core-mcp]"`)

### Fixed

- CI E2E test failure: added `npm run build` before `npm test` in CI workflows (`ci.yml`, `publish.yml`)

### Improved

- **Performance**: Changed direct attribute lookup from `.some()` (O(n²)) to `Set` (O(n)) in `get-entity.ts`
- **Performance**: Cached `Object.values()` result for PropertySet array in `schema-loader.ts` (avoid recomputation per search)
- **Maintainability**: Centralized response creation, error handling, and pagination meta generation
- **Testability**: Added 39 new unit tests across utilities and schema-loader (total: 102 tests)

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

[Unreleased]: https://github.com/shuji-bonji/ifc-core-mcp/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/shuji-bonji/ifc-core-mcp/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/shuji-bonji/ifc-core-mcp/releases/tag/v0.1.0
