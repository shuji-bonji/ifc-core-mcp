# IFC Core MCP Server

[![npm version](https://img.shields.io/npm/v/@shuji-bonji/ifc-core-mcp)](https://www.npmjs.com/package/@shuji-bonji/ifc-core-mcp)
[![CI](https://github.com/shuji-bonji/ifc-core-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/shuji-bonji/ifc-core-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Claude Cowork](https://img.shields.io/badge/Built%20with-Claude%20Cowork-blueviolet?logo=anthropic)](https://claude.com/product/cowork)

[日本語版 README はこちら](./README.ja.md)

**MCP server for IFC4.3 specification reference** — search and retrieve IFC entity definitions, attributes, inheritance hierarchies, and PropertySets.

Unlike existing IFC-related MCP servers that _operate on_ IFC model files (parse, extract, modify), this server provides access to the **IFC specification itself** as a structured reference. It enables AI to look up the _correct definitions_ of entities, attributes, types, and constraints defined in the IFC4.3 standard (ISO 16739-1:2024).

## Key Features

- **Entity Search** — find IFC entities by name or description keyword
- **Entity Definition** — retrieve complete definitions with attributes, inheritance, WHERE rules, and documentation
- **Inheritance Tree** — visualize ancestor chains and descendant hierarchies
- **PropertySet Lookup** — get or search PropertySet definitions with full documentation
- **Dual Output** — every tool supports both Markdown (human-readable) and JSON (structured) formats
- **Pagination** — configurable limit/offset for large result sets

## Available Tools

| Tool                  | Description                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| `ifc_search_entity`   | Search entities by name or description keyword                              |
| `ifc_get_entity`      | Get complete entity definition (attributes, inheritance, WHERE rules, docs) |
| `ifc_get_inheritance` | Show inheritance hierarchy (ancestors, descendants, or both)                |
| `ifc_get_propertyset` | Get or search PropertySet definitions                                       |

## Installation

### npm (global)

```bash
npm install -g @shuji-bonji/ifc-core-mcp
```

### Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ifc-core": {
      "command": "npx",
      "args": ["-y", "@shuji-bonji/ifc-core-mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add ifc-core -- npx -y @shuji-bonji/ifc-core-mcp
```

### From source

```bash
git clone https://github.com/shuji-bonji/ifc-core-mcp.git
cd ifc-core-mcp
npm install
npm run build
node dist/index.js
```

## Data Coverage

The server covers the complete IFC4.3 schema:

| Category          | Count |
| ----------------- | ----- |
| Entities          | 876   |
| Type Declarations | 132   |
| Enumerations      | 243   |
| Select Types      | 61    |
| Functions         | 48    |
| Global Rules      | 2     |

Entities are organized across 4 IFC layers:

| Layer    | Entities | Description                     |
| -------- | -------- | ------------------------------- |
| Resource | 392      | Geometry, units, materials      |
| Core     | 145      | Kernel, product extensions      |
| Shared   | 111      | Walls, columns, beams, MEP      |
| Domain   | 228      | Architecture, HVAC, rail, roads |

## Architecture

```
Build time (one-time, Python):
  IFC.exp (EXPRESS schema) → ifc4x3-schema.json
  IFC4.3.x-development Markdown → ifc4x3-descriptions-*.json

Runtime (TypeScript MCP server):
  Pre-built JSON files → Map-based indexes → MCP tools
```

The server loads three pre-built JSON data files at startup and builds in-memory indexes (Maps) for O(1) entity lookups by name. The EXPRESS schema provides structural data (types, attributes, inheritance, WHERE rules), while the Markdown documentation provides semantic data (definitions, usage, history).

## Data Sources & Licenses

- **EXPRESS schema** (`IFC.exp`) — from [buildingSMART/IFC4.3.x-output](https://github.com/buildingSMART/IFC4.3.x-output)
- **Markdown documentation** — from [buildingSMART/IFC4.3.x-development](https://github.com/buildingSMART/IFC4.3.x-development)
- IFC specification content is licensed under **CC BY-ND 4.0** by buildingSMART International

## Development

### Prerequisites

- Node.js >= 18
- Python 3 + [IfcOpenShell](https://ifcopenshell.org/) (only for data regeneration)

### Commands

```bash
npm run build          # Compile TypeScript
npm run dev            # Watch mode with tsx
npm test               # Run all tests (unit + e2e)
npm run test:unit      # Unit tests only
npm run test:e2e       # E2E integration tests
npm run lint           # ESLint check
npm run format         # Prettier formatting
npm run prepare-data   # Regenerate data from raw sources (requires Python)
```

### Tech Stack

- **Runtime**: TypeScript (strict), Node.js
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **Validation**: Zod
- **Testing**: Vitest (unit + e2e with actual MCP client)
- **Linting**: ESLint + Prettier
- **CI/CD**: GitHub Actions (lint → test → build → publish)

## Related Projects

- [w3c-mcp](https://github.com/shuji-bonji/w3c-mcp) — MCP server for W3C/WHATWG/IETF web specifications
- [rfcxml-mcp](https://github.com/shuji-bonji/rfcxml-mcp) — MCP server for IETF RFC documents (XML-based)

## License

[MIT](./LICENSE)
