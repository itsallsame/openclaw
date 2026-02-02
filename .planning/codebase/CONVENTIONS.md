# Coding Conventions

**Analysis Date:** 2026-02-02

## Naming Patterns

**Files:**
- kebab-case for file names: `pairing-store.ts`, `pairing-messages.ts`, `browser-cli-state.ts`
- Test files use `.test.ts` suffix: `utils.test.ts`, `env.test.ts`, `pairing-messages.test.ts`
- E2E test files use `.e2e.test.ts` suffix: `provider-timeout.e2e.test.ts`, `gateway.multi.e2e.test.ts`
- Live test files use `.live.test.ts` suffix for tests requiring external services
- Specialized test files use descriptive names: `heartbeat-runner.returns-default-unset.test.ts`, `pairing-store.test.ts`

**Functions:**
- camelCase for function names: `buildPairingReply()`, `resolvePairingIdLabel()`, `getDeterministicFreePortBlock()`
- Prefix functions with action verbs: `resolve*`, `create*`, `build*`, `load*`, `store*`, `drain*`, `peek*`, `has*`, `is*`, `should*`
- Private functions use lowercase: `safeChannelKey()`, `resolvePairingPath()`, `safeParseJson()`, `readJsonFile()`
- Factory functions use `create*` prefix: `createMockBaileys()`, `createStubOutbound()`, `createStubPlugin()`, `createTestRegistry()`

**Variables:**
- camelCase for local variables and parameters: `channel`, `code`, `createdAt`, `lastSeenAt`, `meta`
- UPPER_SNAKE_CASE for constants: `PAIRING_CODE_LENGTH`, `PAIRING_CODE_ALPHABET`, `PAIRING_PENDING_TTL_MS`, `PAIRING_PENDING_MAX`
- Prefix boolean variables with `is*`, `has*`, `should*`: `isPortFree()`, `hasSystemEvents()`, `shouldEnableShellEnvFallback()`

**Types:**
- PascalCase for type names: `PairingChannel`, `PairingRequest`, `PairingStore`, `MockBaileysSocket`, `MockBaileysModule`
- Suffix type names with descriptive nouns: `*Request`, `*Store`, `*Options`, `*Result`, `*Adapter`, `*Plugin`
- Use `type` keyword for type aliases: `export type PairingChannel = ChannelId;`
- Use `interface` for object shapes when extensibility is needed

## Code Style

**Formatting:**
- Tool: oxfmt (Rust-based formatter)
- Run with: `pnpm format:fix` to auto-format
- Check with: `pnpm format` to verify formatting
- Line length: No explicit limit enforced by formatter

**Linting:**
- Tool: oxlint (Rust-based linter with type-aware checking)
- Run with: `pnpm lint:fix` to auto-fix issues
- Check with: `pnpm lint` to verify linting
- Config: `.oxlintrc.json` at project root
- Plugins enabled: `unicorn`, `typescript`, `oxc`
- All correctness issues treated as errors

**TypeScript Configuration:**
- Target: ES2022
- Module: NodeNext
- Strict mode: enabled
- `noEmitOnError`: true (fail build on type errors)
- `forceConsistentCasingInFileNames`: true
- `esModuleInterop`: true
- `allowSyntheticDefaultImports`: true

## Import Organization

**Order:**
1. Node.js built-in modules: `import fs from "node:fs";`, `import path from "node:path";`
2. Third-party packages: `import lockfile from "proper-lockfile";`, `import { vi } from "vitest";`
3. Type imports from third-party: `import type { Dispatcher } from "undici";`
4. Local relative imports: `import { getPairingAdapter } from "../channels/plugins/pairing.js";`
5. Type imports from local: `import type { ChannelId } from "../channels/plugins/types.js";`

**Path Aliases:**
- `openclaw/plugin-sdk` → `src/plugin-sdk/index.ts` (defined in vitest.config.ts)
- Relative imports use `../` for parent directories
- Always use `.js` extension in import paths (ESM convention)

**Import Style:**
- Named imports preferred: `import { logInfo, logWarn } from "./logger.js";`
- Type imports use `import type`: `import type { ChannelId } from "./types.js";`
- Default imports for modules: `import fs from "node:fs";`
- Avoid wildcard imports except for type aggregation

## Error Handling

**Patterns:**
- Throw `Error` with descriptive messages: `throw new Error("invalid pairing channel");`
- Include context in error messages: `throw new Error("Failed to optimize PNG image");`
- Use try-catch for async operations and file I/O
- Catch blocks should handle specific error types when possible
- Return `null` for optional parsing failures: `safeParseJson()` returns `T | null`
- Use optional chaining and nullish coalescing: `account?.lastError ?? ""`

**Error Recovery:**
- Provide fallback values: `getPairingAdapter(channel)?.idLabel ?? "userId"`
- Use defensive checks before operations: `if (!raw || !raw.trim()) return;`
- Validate input parameters early: `if (!Number.isFinite(port) || port <= 0 || port > 65535) return false;`

## Logging

**Framework:** Custom logging system via `src/logger.ts`

**Functions:**
- `logInfo(message)` - General information
- `logWarn(message)` - Warnings
- `logSuccess(message)` - Success messages
- `logError(message)` - Error messages
- `logDebug(message)` - Debug-level messages (file logger only, console when verbose)

**Patterns:**
- Subsystem prefix format: `"subsystem: message"` (e.g., `"env: ZAI_API_KEY=...`)
- Subsystem logger created via: `createSubsystemLogger("subsystem-name")`
- Log redacted values for secrets: `formatEnvValue(value, redact: true)` → `"<redacted>"`
- Skip logging in test environments: `if (process.env.VITEST || process.env.NODE_ENV === "test") return;`

**Example:**
```typescript
import { logInfo, logWarn } from "../logger.js";

logInfo("env: OPENCLAW_PROFILE=isolated (profile name)");
logWarn("Failed to load configuration");
```

## Comments

**When to Comment:**
- Document non-obvious algorithm choices or workarounds
- Explain why a decision was made (not what the code does)
- Mark intentional limitations or known issues
- Document complex business logic or domain-specific rules

**JSDoc/TSDoc:**
- Use for public API functions and exported types
- Include parameter descriptions and return types
- Example from codebase:
```typescript
/**
 * Allocate a deterministic per-worker port block.
 *
 * Motivation: many tests spin up gateway + related services that use derived ports
 * (e.g. +1/+2/+3/+4). If each test just grabs an OS free port, parallel test runs
 * can collide on derived ports and get flaky EADDRINUSE.
 */
export async function getDeterministicFreePortBlock(params?: {
  offsets?: number[];
}): Promise<number>
```

## Function Design

**Size:**
- Prefer functions under 100 lines
- Complex logic split into smaller helper functions
- Large files (>500 lines) should be refactored: `check:loc` script enforces max 500 LOC per file

**Parameters:**
- Use object parameters for functions with multiple arguments: `buildPairingReply({ channel, idLine, code })`
- Optional parameters in object: `params?: { offsets?: number[] }`
- Destructure parameters in function signature when possible

**Return Values:**
- Explicit return types on all exported functions
- Use union types for multiple return possibilities: `T | null`, `Promise<T>`
- Return objects for multiple values instead of tuples
- Async functions always return `Promise<T>`

**Example:**
```typescript
export async function readJsonFile<T>(
  filePath: string,
  defaultValue?: T,
): Promise<T | null> {
  try {
    const content = await fs.promises.readFile(filePath, "utf-8");
    return safeParseJson<T>(content) ?? defaultValue ?? null;
  } catch {
    return defaultValue ?? null;
  }
}
```

## Module Design

**Exports:**
- Export types and functions that form the public API
- Keep internal helpers private (no export)
- Use `export type` for type-only exports
- Use `export const` for constants and functions

**Barrel Files:**
- Used in `src/plugin-sdk/index.ts` to aggregate exports
- Not used extensively in other directories
- Prefer direct imports from source files

**File Organization:**
- One primary export per file when possible
- Related types and helpers in same file
- Test utilities in separate `test-utils/` directory
- Mock implementations in `test/mocks/` directory

**Example Structure:**
```typescript
// src/pairing/pairing-store.ts
export type PairingChannel = ChannelId;
export type PairingRequest = { /* ... */ };

// Private types
type PairingStore = { /* ... */ };

// Private functions
function resolveCredentialsDir() { /* ... */ }
function safeChannelKey() { /* ... */ }

// Public functions
export async function loadPairingRequests() { /* ... */ }
export async function savePairingRequest() { /* ... */ }
```

## Async/Await

**Pattern:**
- Use async/await for all asynchronous operations
- Avoid `.then()` chains
- Use `Promise.all()` for parallel operations
- Use `Promise.allSettled()` when some failures are acceptable

**Example:**
```typescript
async function loadAndProcess(paths: string[]): Promise<void> {
  const results = await Promise.all(paths.map(readJsonFile));
  // Process results
}
```

## Type Safety

**Practices:**
- Always provide explicit return types on exported functions
- Use generics for reusable type-safe utilities: `safeParseJson<T>(raw: string): T | null`
- Avoid `any` type; use `unknown` when type is truly unknown
- Use type guards for runtime validation: `typeof value === "string"`
- Leverage TypeScript strict mode for compile-time safety

---

*Convention analysis: 2026-02-02*
