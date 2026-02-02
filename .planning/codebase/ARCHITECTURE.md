# Architecture

**Analysis Date:** 2026-02-02

## Pattern Overview

**Overall:** Multi-layered distributed agent platform with CLI-driven gateway server, channel-based message routing, and pluggable agent execution framework.

**Key Characteristics:**
- CLI-first entry point with command registry pattern for extensibility
- Gateway server as central message hub connecting multiple channels (WhatsApp, Telegram, Slack, Discord, etc.)
- Agent execution layer supporting Pi AI framework with skill-based tool system
- Plugin architecture for channels and extensions with runtime loading
- Session-based routing with agent/account/channel multiplexing
- WebSocket protocol for gateway client communication with device authentication

## Layers

**CLI Layer:**
- Purpose: Command-line interface for all user interactions (gateway, agent, config, onboarding)
- Location: `src/cli/`, `src/commands/`
- Contains: Command registration, argument parsing, subcommand handlers
- Depends on: Config, gateway client, runtime utilities
- Used by: Entry point (`src/entry.ts`), external CLI consumers

**Gateway Server Layer:**
- Purpose: Central message broker and session manager connecting channels to agents
- Location: `src/gateway/`
- Contains: WebSocket server, HTTP endpoints, session management, channel coordination
- Depends on: Channels, agents, config, plugins, infra
- Used by: Channels for message routing, agents for execution context

**Channel Layer:**
- Purpose: Abstraction for messaging platforms (WhatsApp, Telegram, Slack, Discord, Signal, iMessage, etc.)
- Location: `src/channels/`, `src/telegram/`, `src/slack/`, `src/discord/`, `src/signal/`, `src/imessage/`, `src/whatsapp/`, `src/line/`, `src/lark/`
- Contains: Channel monitors, message adapters, platform-specific logic, plugins
- Depends on: Gateway, config, routing
- Used by: Gateway for message ingestion and delivery

**Agent Execution Layer:**
- Purpose: Pi AI agent runtime with tools, skills, and model management
- Location: `src/agents/`
- Contains: Agent scope, model config, bash tools, skills installation, auth profiles, system prompts
- Depends on: Pi AI core, config, infra, plugins
- Used by: Gateway for processing messages and executing tools

**Plugin System:**
- Purpose: Runtime-loadable extensions for channels and custom functionality
- Location: `src/plugins/`, `src/plugin-sdk/`, `src/channels/plugins/`
- Contains: Plugin runtime, service handles, channel adapters, group mention handlers
- Depends on: Config, channels, agents
- Used by: Gateway, channels for dynamic behavior

**Infrastructure Layer:**
- Purpose: Cross-cutting concerns (networking, TLS, device auth, process management, state)
- Location: `src/infra/`
- Contains: Port management, device identity, TLS fingerprinting, environment normalization, binary management, state migrations
- Depends on: Node.js APIs, external services
- Used by: All layers

**Configuration Layer:**
- Purpose: Config file parsing, validation, runtime overrides, session persistence
- Location: `src/config/`
- Contains: Config I/O, schema validation (Zod), session store, paths resolution
- Depends on: Infra, types
- Used by: All layers

**Routing Layer:**
- Purpose: Session key parsing and agent/account/channel resolution
- Location: `src/routing/`
- Contains: Session key normalization, agent ID resolution, account ID parsing
- Depends on: Config
- Used by: Gateway, channels, agents

**Shared Utilities:**
- Purpose: Common helpers and types
- Location: `src/shared/`, `src/utils.ts`, `src/types/`
- Contains: Text processing, type definitions, common utilities
- Depends on: None (leaf layer)
- Used by: All layers

## Data Flow

**Inbound Message Flow:**

1. Channel monitor (e.g., `src/telegram/monitor.ts`) receives message from platform
2. Channel normalizes to `ChannelMessage` and sends to gateway via WebSocket
3. Gateway routes to appropriate agent based on session key
4. Agent processes message, may invoke tools/skills
5. Response flows back through gateway to channel for delivery

**Outbound Message Flow:**

1. Agent generates response text/media
2. Gateway formats for target channel via `ChannelDock` adapters
3. Channel plugin applies platform-specific formatting (text limits, media types)
4. Channel sends via platform API

**Session Resolution:**

1. Message arrives with `sessionKey` (format: `agent:{agentId}:{accountId}:{channelId}:{conversationId}`)
2. `src/routing/session-key.ts` parses to extract agent/account/channel
3. Gateway looks up agent config, channel config, account credentials
4. Agent execution context created with resolved scope

**State Management:**

- Config: File-based (`~/.openclaw/config.json`), hot-reloadable via `src/gateway/config-reload.ts`
- Sessions: Persisted in `src/config/sessions/` with encryption
- Agent state: In-memory during execution, persisted via Pi AI framework
- Channel state: Platform-specific (WhatsApp session, Telegram updates, etc.)

## Key Abstractions

**ChannelDock:**
- Purpose: Lightweight metadata/behavior for shared code paths
- Examples: `src/channels/dock.ts` defines docks for telegram, slack, discord, whatsapp, etc.
- Pattern: Record of channel capabilities, text limits, mention patterns, threading defaults
- Used by: Shared routing code to avoid importing heavy channel modules

**GatewayClient:**
- Purpose: WebSocket client for connecting to gateway
- Examples: `src/gateway/client.ts`
- Pattern: Manages connection lifecycle, message framing, device authentication, protocol versioning
- Used by: CLI commands, agents, external clients

**ChannelPlugin:**
- Purpose: Runtime-loadable channel behavior
- Examples: `src/channels/plugins/telegram.ts`, `src/channels/plugins/slack.ts`
- Pattern: Adapters for commands, groups, mentions, threading, elevated operations
- Used by: Gateway to customize channel handling

**AgentScope:**
- Purpose: Resolved agent configuration and workspace
- Examples: `src/agents/agent-scope.ts`
- Pattern: Combines agent config, workspace path, model settings, tools
- Used by: Agent execution layer to set up runtime context

**SessionKey:**
- Purpose: Hierarchical session identifier
- Examples: `agent:main:default:telegram:12345@c.us`
- Pattern: Encodes agent, account, channel, conversation for routing
- Used by: All layers for message routing and context resolution

## Entry Points

**CLI Entry:**
- Location: `openclaw.mjs` → `src/entry.ts` → `src/cli/program/build-program.ts`
- Triggers: User runs `openclaw` command
- Responsibilities: Parse CLI args, register commands, execute command handler

**Gateway Server Entry:**
- Location: `src/cli/program/register.subclis.ts` → gateway command
- Triggers: `openclaw gateway` command
- Responsibilities: Start WebSocket server, load channels, initialize agents, listen for connections

**Agent Execution Entry:**
- Location: `src/cli/program/register.agent.ts` → agent command
- Triggers: `openclaw agent` command or gateway message routing
- Responsibilities: Load agent config, initialize Pi AI runtime, process message, invoke tools

**Channel Monitor Entry:**
- Location: `src/gateway/server-channels.ts` → `createChannelManager()`
- Triggers: Gateway startup
- Responsibilities: Start platform-specific monitors (Telegram poller, Slack listener, etc.)

## Error Handling

**Strategy:** Layered error handling with graceful degradation and structured logging

**Patterns:**

- **Unhandled Rejections:** Global handler in `src/entry.ts` catches and logs with `formatUncaughtError()`
- **Port Conflicts:** `src/infra/ports.js` detects and suggests alternatives
- **Config Errors:** Validation in `src/config/validation.ts` with Zod schema, migration for legacy configs
- **Channel Failures:** Individual channel monitors fail independently, gateway continues
- **Agent Crashes:** Caught by gateway, error logged, session marked failed
- **Network Errors:** WebSocket reconnection logic in `src/gateway/client.ts` with exponential backoff
- **Tool Execution:** Bash tool errors captured in `src/agents/bash-tools.exec.ts`, returned as tool result

## Cross-Cutting Concerns

**Logging:**
- Subsystem-based via `src/logging/subsystem.ts` with child loggers per component
- Structured output via `tslog` with JSON support
- Console capture in `src/logging.ts` to redirect all output to structured logs

**Validation:**
- Config validation via Zod schema in `src/config/zod-schema.ts`
- Session key parsing with regex in `src/routing/session-key.ts`
- Message validation in `src/gateway/protocol/` for WebSocket frames

**Authentication:**
- Device identity in `src/infra/device-identity.ts` with public key signing
- Device auth tokens in `src/infra/device-auth-store.ts`
- Auth profiles for model providers in `src/agents/auth-profiles/`
- Gateway token/password in `src/gateway/auth.ts`

**Plugin Loading:**
- Dynamic import via `src/plugins/runtime.ts`
- Service handles in `src/plugins/services.js`
- Auto-enable logic in `src/config/plugin-auto-enable.ts`

---

*Architecture analysis: 2026-02-02*
