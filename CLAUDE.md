# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build, Test, and Lint Commands

```bash
# Build the TypeScript project
npm run build

# Run tests with coverage
npm run test

# Run linting
npm run lint

# Format code with Prettier
npm run format
```

## Project Architecture

### Core Algorithm

The plugin uses a three-phase pipelined algorithm for analyzing imports/exports. See the [Algorithm section in README.md](README.md#algorithm) for detailed documentation.

**Implementation location:** `src/module/`

- `computeBaseInfo.ts` - Phase 1: AST analysis using oxc-parser
- `computeResolvedInfo.ts` - Phase 2: Module specifier resolution
- `computeAnalyzedInfo.ts` - Phase 3: Import graph analysis
- `module.ts` - Orchestrates the three phases and manages caching

### Caching Behavior

See [mode configuration in README.md](README.md#mode) for details on caching modes.

**Important for development:**

- Caching is disabled when running `npm run lint` (uses `one-shot` mode via auto-detection)
- Caching is enabled but file watching is disabled in tests (tests explicitly set `mode: 'fix'` in settings)
- The `fix` and `editor` modes enable caching for file updates, but only `editor` mode enables file watching

### Project Structure

```
src/
├── module/          # Core algorithm implementation (3-phase pipeline)
├── rules/           # ESLint rule implementations
│   ├── cycle/       # no-cycle rule
│   ├── entryPoint/  # no-entry-point-imports rule
│   ├── extension/   # consistent-file-extensions rule
│   ├── unused/      # no-unused-exports rule
│   └── ...
├── settings/        # Configuration parsing and validation
├── types/           # TypeScript type definitions for each phase
│   ├── base.ts      # Types for Phase 1
│   ├── resolved.ts  # Types for Phase 2
│   └── analyzed.ts  # Types for Phase 3
└── util/            # Shared utilities
```

### Testing Patterns

- Tests are located in `__test__` directories alongside the code they test
- Rule tests use `@typescript-eslint/rule-tester`
- Test projects for integration tests are in `__test__/project/` subdirectories

### Key Dependencies

- **oxc-parser**: Rust-based JavaScript/TypeScript parser for performance
- **zod v4**: Schema validation with native `toJSONSchema()` for ESLint rule schemas
- **@typescript-eslint/utils**: ESLint rule creation utilities

## Common Development Tasks

### Adding a New Rule

See [Creating new rules](README.md#creating-new-rules) for detailed documentation.

1. Create a new directory under `src/rules/`
2. Implement the rule using `createRule` from `src/rules/util.ts`
3. Use `getESMInfo(context)` to access parsed import/export information
4. Add tests in `__test__/` subdirectory:
   - Create a `project/` directory with sample source files for the rule to analyze
   - Tests point `rootDir` to this project directory (see `TEST_PROJECT_DIR` constant)
   - Test cases reference files within that project (e.g., `FILE_A`, `FILE_B`)
5. Create a README.md in the rule directory following the style of other rules
6. Export from `src/plugin.ts`
7. Add the rule to the list of rules in [Rules](README.md#rules)

### Working with Function Overloads

TypeScript function overloads are de-duplicated in `computeBaseInfo.ts`. Only the final implementation (not the overload signatures) is tracked as an export.

### Schema Validation

Use zod v4's native `schema.toJSONSchema()` for ESLint rule option schemas. For schemas containing `z.instanceof(RegExp)`, use `{ unrepresentable: 'any' }` option.
