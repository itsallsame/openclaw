# Testing Patterns

**Analysis Date:** 2026-02-02

## Test Framework

**Runner:**
- Vitest 4.0.18
- Config: `vitest.config.ts` (main), `vitest.e2e.config.ts`, `vitest.unit.config.ts`, `vitest.live.config.ts`, `vitest.gateway.config.ts`, `vitest.extensions.config.ts`

**Assertion Library:**
- Vitest built-in expect API (compatible with Jest)

**Run Commands:**
```bash
pnpm test                    # Run all unit tests (parallel)
pnpm test:watch             # Watch mode for development
pnpm test:coverage          # Generate coverage report
pnpm test:e2e               # Run E2E tests
pnpm test:live              # Run live tests (requires external services)
pnpm test:unit              # Run unit tests only (excludes gateway)
pnpm test:force             # Force re-run all tests
```

## Test File Organization

**Location:**
- Co-located with source files: `src/pairing/pairing-store.ts` → `src/pairing/pairing-store.test.ts`
- Test utilities in: `src/test-utils/` directory
- Mock implementations in: `test/mocks/` directory
- Global setup in: `test/setup.ts`, `test/global-setup.ts`
- E2E helpers in: `test/helpers/` directory

**Naming:**
- Unit tests: `*.test.ts` suffix
- E2E tests: `*.e2e.test.ts` suffix
- Live tests: `*.live.test.ts` suffix (require external services)
- Specialized tests: descriptive names like `heartbeat-runner.returns-default-unset.test.ts`

**Structure:**
```
src/
├── pairing/
│   ├── pairing-store.ts
│   ├── pairing-store.test.ts
│   ├── pairing-messages.ts
│   └── pairing-messages.test.ts
├── test-utils/
│   ├── ports.ts
│   ├── channel-plugins.ts
│   └── (shared test utilities)
└── (other modules)

test/
├── setup.ts                 # Global test setup
├── global-setup.ts          # Vitest global setup
├── test-env.ts              # Test environment utilities
├── mocks/
│   └── baileys.ts           # Mock implementations
└── helpers/
    └── inbound-contract.ts  # E2E test helpers
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

describe("buildPairingReply", () => {
  let previousProfile: string | undefined;

  beforeEach(() => {
    previousProfile = process.env.OPENCLAW_PROFILE;
    process.env.OPENCLAW_PROFILE = "isolated";
  });

  afterEach(() => {
    if (previousProfile === undefined) {
      delete process.env.OPENCLAW_PROFILE;
      return;
    }
    process.env.OPENCLAW_PROFILE = previousProfile;
  });

  it("formats pairing reply for discord", () => {
    const text = buildPairingReply({
      channel: "discord",
      idLine: "Your Discord user id: 1",
      code: "ABC123",
    });
    expect(text).toContain("Your Discord user id: 1");
    expect(text).toContain("Pairing code: ABC123");
  });
});
```

**Patterns:**
- Use `describe()` to group related tests
- Use `it()` for individual test cases
- Use `beforeEach()` for setup before each test
- Use `afterEach()` for cleanup after each test
- Use `beforeAll()` for one-time setup (rarely needed)
- Use `afterAll()` for one-time cleanup (rarely needed)

## Mocking

**Framework:** Vitest's `vi` object

**Patterns:**
```typescript
// Mock a module
vi.mock("../logger.js", async () => {
  const actual = await vi.importActual<typeof import("../logger.js")>("../logger.js");
  return {
    ...actual,
    logInfo: vi.fn(),
  };
});

// Mock a function
const mockFn = vi.fn();
const mockFnWithReturn = vi.fn().mockResolvedValue({ key: { id: "msg123" } });
const mockFnWithImplementation = vi.fn((opts: unknown) => {
  // custom implementation
});

// Spy on existing function
const spy = vi.spyOn(fs, "readFileSync").mockImplementation((path: any, encoding?: any) => {
  if (path === mappingPath) return `"5551234"`;
  return original(path, encoding);
});
spy.mockRestore();

// Check mock calls
expect(lidLookup.getPNForLID).toHaveBeenCalledWith("777@lid");
expect(lidLookup.getPNForLID).not.toHaveBeenCalled();
```

**What to Mock:**
- External dependencies (file system, network, external APIs)
- Third-party modules that are hard to set up
- Functions with side effects (logging, system calls)
- Time-dependent functions (use fake timers instead)

**What NOT to Mock:**
- Core business logic being tested
- Pure utility functions
- Type definitions
- Internal module dependencies (test the integration)

## Fixtures and Factories

**Test Data:**
```typescript
// From pairing-messages.test.ts
const cases = [
  {
    channel: "discord",
    idLine: "Your Discord user id: 1",
    code: "ABC123",
  },
  {
    channel: "slack",
    idLine: "Your Slack user id: U1",
    code: "DEF456",
  },
] as const;

for (const testCase of cases) {
  it(`formats pairing reply for ${testCase.channel}`, () => {
    const text = buildPairingReply(testCase);
    expect(text).toContain(testCase.idLine);
  });
}
```

**Factory Functions:**
```typescript
// From test/setup.ts
export const createStubOutbound = (
  id: ChannelId,
  deliveryMode: ChannelOutboundAdapter["deliveryMode"] = "direct",
): ChannelOutboundAdapter => ({
  deliveryMode,
  sendText: async ({ deps, to, text }) => {
    const send = pickSendFn(id, deps);
    if (send) {
      const result = await send(to, text, {});
      return { channel: id, ...result };
    }
    return { channel: id, messageId: "test" };
  },
  sendMedia: async ({ deps, to, text, mediaUrl }) => {
    // implementation
  },
});

export const createStubPlugin = (params: {
  id: ChannelId;
  label?: string;
  aliases?: string[];
}): ChannelPlugin => ({
  id: params.id,
  meta: { /* ... */ },
  capabilities: { /* ... */ },
  config: { /* ... */ },
  outbound: createStubOutbound(params.id),
});
```

**Location:**
- Test utilities in: `src/test-utils/` (e.g., `channel-plugins.ts`, `ports.ts`)
- Mock implementations in: `test/mocks/` (e.g., `baileys.ts`)
- Shared setup in: `test/setup.ts`

## Coverage

**Requirements:**
- Lines: 70%
- Functions: 70%
- Branches: 55%
- Statements: 70%

**View Coverage:**
```bash
pnpm test:coverage
```

**Coverage Configuration:**
- Provider: v8
- Reporters: text, lcov
- Include: `src/**/*.ts`
- Exclude: `src/**/*.test.ts` and intentionally untested areas (CLI, daemon, channels, etc.)

**Excluded from Coverage:**
- Entry points: `src/entry.ts`, `src/index.ts`, `src/runtime.ts`
- CLI commands: `src/cli/**`, `src/commands/**`
- Daemon/hooks: `src/daemon/**`, `src/hooks/**`
- Platform-specific: `src/macos/**`
- Agent integrations: `src/agents/model-scan.ts`, `src/agents/sandbox.ts`, etc.
- Gateway surfaces: `src/gateway/control-ui.ts`, `src/gateway/server-*.ts`
- Channel implementations: `src/discord/**`, `src/slack/**`, `src/telegram/**`, etc.
- Interactive UIs: `src/tui/**`, `src/wizard/**`

## Test Types

**Unit Tests:**
- Scope: Individual functions and modules
- Approach: Test pure functions, utilities, and business logic
- Isolation: Mock external dependencies
- Speed: Fast (milliseconds)
- Location: `src/**/*.test.ts`
- Example: `src/utils.test.ts`, `src/infra/env.test.ts`

**Integration Tests:**
- Scope: Multiple modules working together
- Approach: Test interactions between components
- Isolation: Minimal mocking, use real implementations where possible
- Speed: Moderate (seconds)
- Location: `src/**/*.test.ts` (same as unit tests, distinguished by scope)
- Example: `src/pairing/pairing-store.test.ts` (tests file I/O + business logic)

**E2E Tests:**
- Scope: Full system workflows
- Approach: Test complete user flows
- Isolation: Minimal mocking, use real services where possible
- Speed: Slow (minutes)
- Config: `vitest.e2e.config.ts`
- Location: `test/**/*.e2e.test.ts`, `src/**/*.e2e.test.ts`
- Example: `test/gateway.multi.e2e.test.ts`, `test/provider-timeout.e2e.test.ts`

**Live Tests:**
- Scope: Integration with external services
- Approach: Test against real APIs (OpenAI, Anthropic, etc.)
- Isolation: None (requires external services)
- Speed: Very slow (minutes+)
- Config: `vitest.live.config.ts`
- Location: `src/**/*.live.test.ts`
- Trigger: `OPENCLAW_LIVE_TEST=1 CLAWDBOT_LIVE_TEST=1 pnpm test:live`

## Common Patterns

**Async Testing:**
```typescript
// Using async/await
it("resolves after delay using fake timers", async () => {
  vi.useFakeTimers();
  const promise = sleep(1000);
  vi.advanceTimersByTime(1000);
  await expect(promise).resolves.toBeUndefined();
  vi.useRealTimers();
});

// Using Promise resolution
it("resolves @lid via lidLookup when mapping file is missing", async () => {
  const lidLookup = {
    getPNForLID: vi.fn().mockResolvedValue("777:0@s.whatsapp.net"),
  };
  await expect(resolveJidToE164("777@lid", { lidLookup })).resolves.toBe("+777");
  expect(lidLookup.getPNForLID).toHaveBeenCalledWith("777@lid");
});
```

**Error Testing:**
```typescript
// Testing thrown errors
it("throws for invalid channel", () => {
  expect(() => assertWebChannel("bad" as string)).toThrow();
});

// Testing rejected promises
it("rejects on network error", async () => {
  const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
  await expect(fetchData()).rejects.toThrow("Network error");
});
```

**File System Testing:**
```typescript
it("creates nested directory", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "openclaw-test-"));
  const target = path.join(tmp, "nested", "dir");
  await ensureDir(target);
  expect(fs.existsSync(target)).toBe(true);
  // Cleanup
  await fs.promises.rm(tmp, { recursive: true, force: true });
});
```

**Environment Variable Testing:**
```typescript
it("copies Z_AI_API_KEY to ZAI_API_KEY when missing", () => {
  const prevZai = process.env.ZAI_API_KEY;
  const prevZAi = process.env.Z_AI_API_KEY;

  process.env.ZAI_API_KEY = "";
  process.env.Z_AI_API_KEY = "zai-legacy";

  normalizeZaiEnv();

  expect(process.env.ZAI_API_KEY).toBe("zai-legacy");

  // Restore
  if (prevZai === undefined) delete process.env.ZAI_API_KEY;
  else process.env.ZAI_API_KEY = prevZai;
  if (prevZAi === undefined) delete process.env.Z_AI_API_KEY;
  else process.env.Z_AI_API_KEY = prevZAi;
});
```

**Parametrized Tests:**
```typescript
const cases = [
  { input: "foo", expected: "/foo" },
  { input: "/bar", expected: "/bar" },
] as const;

for (const testCase of cases) {
  it(`normalizes path: ${testCase.input}`, () => {
    expect(normalizePath(testCase.input)).toBe(testCase.expected);
  });
}
```

## Test Configuration

**Main Config (`vitest.config.ts`):**
- Test timeout: 120 seconds
- Hook timeout: 120 seconds (180 on Windows)
- Pool: forks (isolated worker processes)
- Max workers: 3 on CI, 4-16 locally (based on CPU count)
- Setup files: `test/setup.ts`
- Includes: `src/**/*.test.ts`, `extensions/**/*.test.ts`, `test/format-error.test.ts`
- Excludes: dist, node_modules, `.live.test.ts`, `.e2e.test.ts`

**E2E Config (`vitest.e2e.config.ts`):**
- Pool: forks
- Max workers: 2 on CI, 1-4 locally (25% of CPU count)
- Includes: `test/**/*.e2e.test.ts`, `src/**/*.e2e.test.ts`
- Setup files: `test/setup.ts`

**Unit Config (`vitest.unit.config.ts`):**
- Extends base config
- Excludes: `src/gateway/**`, `extensions/**`

**Live Config (`vitest.live.config.ts`):**
- Includes: `src/**/*.live.test.ts`
- For testing against real external services

## Global Setup

**File:** `test/setup.ts`

**Responsibilities:**
- Install process warning filter
- Create isolated test home directory
- Set up default plugin registry with stub implementations
- Reset fake timers after each test
- Provide helper functions for creating test plugins and outbound adapters

**Key Utilities:**
```typescript
// From test/setup.ts
const testEnv = withIsolatedTestHome();
afterAll(() => testEnv.cleanup());

beforeEach(() => {
  setActivePluginRegistry(createDefaultRegistry());
});

afterEach(() => {
  setActivePluginRegistry(createDefaultRegistry());
  vi.useRealTimers();
});
```

## Best Practices

**Do:**
- Test behavior, not implementation details
- Use descriptive test names that explain what is being tested
- Keep tests focused on a single concern
- Use setup/teardown to manage test state
- Clean up resources (files, timers, mocks) after tests
- Use parametrized tests for multiple similar cases
- Mock external dependencies consistently

**Don't:**
- Test private implementation details
- Create interdependent tests (each test should be independent)
- Use real external services in unit tests (mock them)
- Leave fake timers enabled between tests
- Commit environment-specific test data
- Test framework behavior (test your code, not Vitest)

---

*Testing analysis: 2026-02-02*
