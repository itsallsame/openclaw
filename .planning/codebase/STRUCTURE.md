# Codebase Structure

**Analysis Date:** 2026-02-02

## Directory Layout

```
openclaw/
├── src/                          # Main TypeScript source code
│   ├── entry.ts                  # CLI entry point (respawns with NODE_OPTIONS)
│   ├── index.ts                  # Main export barrel
│   ├── cli/                      # Command-line interface
│   ├── commands/                 # Command implementations
│   ├── gateway/                  # Gateway server (message hub)
│   ├── agents/                   # Agent execution layer
│   ├── channels/                 # Channel abstractions and plugins
│   ├── config/                   # Configuration management
│   ├── routing/                  # Session key parsing and routing
│   ├── infra/                    # Infrastructure utilities
│   ├── plugins/                  # Plugin system runtime
│   ├── plugin-sdk/               # Public plugin SDK
│   ├── telegram/                 # Telegram channel
│   ├── slack/                    # Slack channel
│   ├── discord/                  # Discord channel
│   ├── signal/                   # Signal channel
│   ├── imessage/                 # iMessage channel
│   ├── whatsapp/                 # WhatsApp channel
│   ├── line/                     # LINE channel
│   ├── lark/                     # Lark channel
│   ├── web/                      # Web channel (WhatsApp Web)
│   ├── browser/                  # Browser automation
│   ├── canvas-host/              # Canvas rendering host
│   ├── daemon/                   # Daemon process management
│   ├── cron/                     # Cron job execution
│   ├── auto-reply/               # Auto-reply templating
│   ├── memory/                   # Memory/vector search
│   ├── media/                    # Media processing
│   ├── media-understanding/      # Media analysis (vision)
│   ├── link-understanding/       # Link preview extraction
│   ├── tts/                      # Text-to-speech
│   ├── markdown/                 # Markdown processing
│   ├── terminal/                 # Terminal UI components
│   ├── tui/                      # Terminal user interface
│   ├── wizard/                   # Onboarding wizard
│   ├── sessions/                 # Session management
│   ├── security/                 # Security utilities
│   ├── logging/                  # Logging infrastructure
│   ├── shared/                   # Shared utilities
│   ├── utils.ts                  # Common utilities
│   ├── types/                    # Type definitions
│   ├── test-helpers/             # Test utilities
│   └── test-utils/               # Test utilities
├── dist/                         # Compiled JavaScript (generated)
├── extensions/                   # Built-in extensions
├── skills/                       # Built-in skills
├── ui/                           # React UI (separate package)
├── apps/                         # Native apps (iOS, Android, macOS)
├── docs/                         # Documentation
├── test/                         # E2E and integration tests
├── scripts/                      # Build and utility scripts
├── packages/                     # Monorepo packages
├── openclaw.mjs                  # CLI entry script
├── package.json                  # Root package manifest
├── tsconfig.json                 # TypeScript configuration
├── vitest.config.ts              # Test configuration
└── pnpm-workspace.yaml           # Monorepo workspace config
```

## Directory Purposes

**src/cli/:**
- Purpose: Command-line interface infrastructure
- Contains: Program builder, command registry, argument parsing, subcommand routing
- Key files: `program/build-program.ts`, `program/command-registry.ts`, `program/context.ts`

**src/commands/:**
- Purpose: Standalone command implementations
- Contains: agent, channels, gateway-status, models, onboarding, status-all commands
- Key files: `agent/index.ts`, `channels/index.ts`, `onboarding/index.ts`

**src/gateway/:**
- Purpose: Central message hub and session manager
- Contains: WebSocket server, HTTP endpoints, session utils, channel coordination, model catalog
- Key files: `server.impl.ts`, `client.ts`, `session-utils.ts`, `server-methods.ts`

**src/agents/:**
- Purpose: Agent execution runtime with Pi AI framework
- Contains: Model config, bash tools, skills, auth profiles, system prompts, subagent registry
- Key files: `agent-scope.ts`, `bash-tools.exec.ts`, `system-prompt.ts`, `models-config.providers.ts`

**src/channels/:**
- Purpose: Channel abstractions and shared routing logic
- Contains: Channel dock metadata, registry, plugins, allowlists, command gating
- Key files: `dock.ts`, `registry.ts`, `plugins/index.ts`

**src/config/:**
- Purpose: Configuration file management and validation
- Contains: Config I/O, Zod schema, session store, path resolution, legacy migration
- Key files: `io.ts`, `zod-schema.ts`, `sessions/`, `types.ts`

**src/routing/:**
- Purpose: Session key parsing and agent/account/channel resolution
- Contains: Session key normalization, agent ID resolution, account ID parsing
- Key files: `session-key.ts`

**src/infra/:**
- Purpose: Infrastructure utilities and cross-cutting concerns
- Contains: Port management, device auth, TLS, environment, binary management, state migrations
- Key files: `ports.js`, `device-identity.ts`, `device-auth-store.ts`, `env.js`

**src/plugins/:**
- Purpose: Plugin system runtime and service handles
- Contains: Plugin loader, service registry, runtime initialization
- Key files: `runtime.ts`, `services.js`

**src/plugin-sdk/:**
- Purpose: Public API for plugin developers
- Contains: Type definitions, helper functions, exported interfaces
- Key files: `index.ts`

**src/telegram/, src/slack/, src/discord/, etc.:**
- Purpose: Platform-specific channel implementations
- Contains: Monitors, message adapters, account management, platform APIs
- Key files: `monitor.ts`, `accounts.ts`, `bot.ts` (varies by platform)

**src/browser/:**
- Purpose: Browser automation for web-based channels
- Contains: Playwright integration, route handlers, browser lifecycle
- Key files: `routes/`, browser control logic

**src/canvas-host/:**
- Purpose: Canvas rendering for image generation
- Contains: A2UI bundling, rendering server
- Key files: `a2ui/`

**src/daemon/:**
- Purpose: Daemon process management
- Contains: Daemon lifecycle, signal handling
- Key files: Daemon-specific utilities

**src/cron/:**
- Purpose: Cron job execution and scheduling
- Contains: Isolated agent execution, cron service
- Key files: `isolated-agent/`, `service/`

**src/auto-reply/:**
- Purpose: Auto-reply message templating
- Contains: Template parsing, variable substitution
- Key files: `reply/`, `templating.ts`

**src/memory/:**
- Purpose: Memory and vector search
- Contains: Vector database integration, memory queries
- Key files: Memory-specific utilities

**src/media/, src/media-understanding/, src/link-understanding/:**
- Purpose: Media and content processing
- Contains: Image/video processing, vision API integration, link preview extraction
- Key files: `providers/` (for media-understanding)

**src/tts/:**
- Purpose: Text-to-speech synthesis
- Contains: TTS provider integration
- Key files: TTS-specific utilities

**src/logging/:**
- Purpose: Logging infrastructure
- Contains: Subsystem logger, diagnostic events, structured output
- Key files: `subsystem.ts`, `diagnostic.ts`

**src/shared/:**
- Purpose: Shared utilities
- Contains: Text processing, common helpers
- Key files: `text/`

**src/types/:**
- Purpose: Shared type definitions
- Contains: Common interfaces and types
- Key files: Type definition files

**dist/:**
- Purpose: Compiled JavaScript output
- Generated: Yes (from `tsc` build)
- Committed: No (gitignored)

**extensions/:**
- Purpose: Built-in extensions
- Contains: Pre-packaged extensions
- Committed: Yes

**skills/:**
- Purpose: Built-in skills for agents
- Contains: Skill definitions and implementations
- Committed: Yes

**ui/:**
- Purpose: React-based web UI
- Contains: Separate TypeScript/React package
- Key files: `package.json`, `src/`, `tsconfig.json`

**apps/:**
- Purpose: Native mobile and desktop applications
- Contains: iOS (Swift), Android (Kotlin), macOS (Swift)
- Key files: `ios/`, `android/`, `macos/`

**docs/:**
- Purpose: Documentation site
- Contains: Markdown docs, API references
- Key files: Documentation files

**test/:**
- Purpose: E2E and integration tests
- Contains: Docker-based tests, installation tests
- Key files: Test scripts

**scripts/:**
- Purpose: Build and utility scripts
- Contains: Build helpers, setup scripts, test runners
- Key files: `run-node.mjs`, `build-docs-list.mjs`, `test-parallel.mjs`

## Key File Locations

**Entry Points:**
- `openclaw.mjs`: CLI entry script (respawns with NODE_OPTIONS)
- `src/entry.ts`: Main entry point (loads CLI program)
- `src/index.ts`: Main export barrel for library usage
- `src/cli/program/build-program.ts`: CLI program builder

**Configuration:**
- `tsconfig.json`: TypeScript compiler options
- `package.json`: Root package manifest with scripts
- `pnpm-workspace.yaml`: Monorepo workspace definition
- `vitest.config.ts`: Test runner configuration

**Core Logic:**
- `src/gateway/server.impl.ts`: Gateway server implementation
- `src/agents/agent-scope.ts`: Agent configuration resolution
- `src/channels/dock.ts`: Channel metadata and behavior
- `src/routing/session-key.ts`: Session key parsing

**Testing:**
- `src/**/*.test.ts`: Unit tests (co-located with source)
- `test/`: E2E and integration tests
- `vitest.config.ts`: Main test config
- `vitest.unit.config.ts`: Unit test config
- `vitest.e2e.config.ts`: E2E test config

## Naming Conventions

**Files:**
- `*.ts`: TypeScript source files
- `*.test.ts`: Unit test files (co-located with source)
- `*.impl.ts`: Implementation files (used when interface is in separate file)
- `*.types.ts`: Type-only files
- `*.helpers.ts`: Helper/utility functions
- `*.mocks.ts`: Mock implementations for testing
- `register.*.ts`: Command registration files in CLI
- `server-*.ts`: Gateway server feature files

**Directories:**
- `src/[feature]/`: Feature modules (telegram, slack, agents, etc.)
- `src/[feature]/plugins/`: Plugin implementations for feature
- `src/[feature]/monitor.ts`: Platform monitor (for channels)
- `src/[feature]/accounts.ts`: Account management (for channels)

**Functions:**
- `camelCase` for all functions and variables
- `PascalCase` for classes and types
- `UPPER_SNAKE_CASE` for constants

**Exports:**
- Barrel files (`index.ts`) re-export public API
- Internal utilities use relative imports
- Cross-module imports use absolute paths from `src/`

## Where to Add New Code

**New Feature:**
- Primary code: `src/[feature-name]/`
- Tests: `src/[feature-name]/[feature].test.ts` (co-located)
- Types: `src/[feature-name]/types.ts` or inline in main file
- Exports: `src/[feature-name]/index.ts` barrel file

**New Channel/Platform:**
- Implementation: `src/[platform-name]/`
- Monitor: `src/[platform-name]/monitor.ts`
- Accounts: `src/[platform-name]/accounts.ts`
- Plugin: `src/channels/plugins/[platform-name].ts`
- Dock entry: Add to `DOCKS` in `src/channels/dock.ts`

**New CLI Command:**
- Command handler: `src/commands/[command-name]/index.ts`
- Registration: `src/cli/program/register.[command-name].ts`
- Register in: `src/cli/program/command-registry.ts`

**New Gateway Feature:**
- Implementation: `src/gateway/server-[feature].ts`
- Methods: `src/gateway/server-methods/[feature].ts`
- Add to: `src/gateway/server-methods-list.ts`

**Utilities:**
- Shared helpers: `src/shared/[category]/`
- Common utils: `src/utils.ts`
- Infrastructure: `src/infra/[concern].ts`

**Types:**
- Shared types: `src/types/[domain].ts`
- Feature-specific: `src/[feature]/types.ts`

## Special Directories

**dist/:**
- Purpose: Compiled JavaScript output
- Generated: Yes (by `tsc` during build)
- Committed: No (in .gitignore)
- Structure: Mirrors `src/` directory structure

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes (by `pnpm install`)
- Committed: No (in .gitignore)

**.planning/codebase/:**
- Purpose: GSD codebase analysis documents
- Generated: Yes (by GSD mapper)
- Committed: Yes (for team reference)
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md, CONCERNS.md

**.claude/:**
- Purpose: Claude agent context and state
- Generated: Yes (by Claude agent)
- Committed: No (in .gitignore)

**extensions/:**
- Purpose: Built-in extensions
- Generated: No (manually maintained)
- Committed: Yes

**skills/:**
- Purpose: Built-in skills
- Generated: No (manually maintained)
- Committed: Yes

---

*Structure analysis: 2026-02-02*
