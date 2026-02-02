# External Integrations

**Analysis Date:** 2026-02-02

## APIs & External Services

**Large Language Models (LLMs):**
- Anthropic Claude - Primary LLM provider
  - SDK/Client: Built-in via Pi agent framework
  - Auth: `ANTHROPIC_API_KEY` (API key) or `ANTHROPIC_OAUTH_TOKEN` (OAuth)
  - Implementation: `src/config/defaults.ts`, `src/agents/`
  - Models: Claude Opus 4.5, Claude Sonnet 4.5

- OpenAI GPT - Alternative LLM provider
  - SDK/Client: OpenAI API (via undici HTTP client)
  - Auth: `OPENAI_API_KEY`
  - Implementation: `src/memory/batch-openai.ts`, `src/memory/embeddings.ts`
  - Models: GPT-5.2, GPT-5-mini

- Google Gemini - Alternative LLM provider
  - SDK/Client: Google API client
  - Auth: `GEMINI_API_KEY`
  - Implementation: `src/memory/embeddings-gemini.ts`, `src/memory/batch-gemini.ts`
  - Models: Gemini 3 Pro Preview, Gemini 3 Flash Preview

- AWS Bedrock - AWS-hosted LLM access
  - SDK/Client: `@aws-sdk/client-bedrock`
  - Auth: AWS credentials (via environment or IAM)
  - Implementation: `src/agents/bedrock-discovery.test.ts`

- Groq - Fast inference LLM provider
  - SDK/Client: Groq API
  - Auth: `GROQ_API_KEY`
  - Implementation: `src/media-understanding/providers/groq/`

- Minimax - Chinese LLM provider
  - SDK/Client: Minimax API
  - Auth: `MINIMAX_API_KEY`
  - Implementation: `src/infra/provider-usage.fetch.minimax.ts`

- OpenRouter - LLM aggregator
  - SDK/Client: OpenRouter API
  - Auth: `OPENROUTER_API_KEY`
  - Implementation: Config-based model selection

**Speech & Audio:**
- Deepgram - Speech-to-text (ASR)
  - SDK/Client: Deepgram API
  - Auth: `DEEPGRAM_API_KEY`
  - Implementation: `src/media-understanding/providers/deepgram/`
  - Purpose: Video/audio transcription for video editing skills

- ElevenLabs - Text-to-speech (TTS)
  - SDK/Client: ElevenLabs API
  - Auth: `ELEVENLABS_API_KEY`
  - Implementation: `src/config/talk.ts`
  - Purpose: Voice synthesis for agent responses

- Edge TTS - Microsoft text-to-speech
  - SDK/Client: `node-edge-tts`
  - Auth: None (free service)
  - Implementation: Fallback TTS provider

**Media Understanding:**
- OpenAI Vision - Image understanding
  - SDK/Client: OpenAI API
  - Auth: `OPENAI_API_KEY`
  - Implementation: `src/media-understanding/providers/openai/`

- Google Vision - Image understanding
  - SDK/Client: Google API
  - Auth: `GEMINI_API_KEY`
  - Implementation: `src/media-understanding/providers/google/`

- Anthropic Vision - Image understanding
  - SDK/Client: Claude API
  - Auth: `ANTHROPIC_API_KEY`
  - Implementation: `src/media-understanding/providers/anthropic/`

- Minimax Vision - Image understanding
  - SDK/Client: Minimax API
  - Auth: `MINIMAX_API_KEY`
  - Implementation: `src/media-understanding/providers/minimax/`

**Messaging Channels:**
- WhatsApp (via Baileys)
  - SDK/Client: `@whiskeysockets/baileys` 7.0.0-rc.9
  - Auth: QR code pairing (session-based)
  - Implementation: `src/whatsapp/`, `src/gateway/`
  - Purpose: WhatsApp message gateway

- Telegram
  - SDK/Client: `grammy` 1.39.3
  - Auth: `TELEGRAM_BOT_TOKEN`
  - Implementation: `src/telegram/`
  - Purpose: Telegram bot integration

- Discord
  - SDK/Client: `discord-api-types` 0.38.37
  - Auth: `DISCORD_BOT_TOKEN`
  - Implementation: `src/discord/`
  - Purpose: Discord bot integration

- Slack
  - SDK/Client: `@slack/bolt` 4.6.0, `@slack/web-api` 7.13.0
  - Auth: `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`
  - Implementation: `src/slack/`
  - Purpose: Slack bot and app integration

- LINE
  - SDK/Client: `@line/bot-sdk` 10.6.0
  - Auth: LINE channel credentials
  - Implementation: `src/line/`
  - Purpose: LINE messaging platform integration

- Lark (DingTalk)
  - SDK/Client: `@larksuiteoapi/node-sdk` 1.56.1
  - Auth: `LARK_APP_ID`, `LARK_APP_SECRET`
  - Implementation: `src/lark/`
  - Purpose: Lark/DingTalk enterprise messaging

**Other Services:**
- GitHub Copilot - Code completion
  - Auth: GitHub Copilot token
  - Implementation: `src/providers/github-copilot-*.ts`

- Qwen Portal - Alibaba AI services
  - Auth: OAuth token
  - Implementation: `src/providers/qwen-portal-oauth.ts`

## Data Storage

**Databases:**
- SQLite (Node.js built-in)
  - Connection: File-based (`~/.openclaw/` or `OPENCLAW_STATE_DIR`)
  - Client: `node:sqlite` (Node.js 22+ native)
  - Purpose: Session storage, memory index, configuration
  - Implementation: `src/memory/manager.ts`, `src/memory/memory-schema.ts`

- sqlite-vec - Vector search extension
  - Purpose: Semantic search for memory/embeddings
  - Implementation: `src/memory/sqlite-vec.ts`
  - Used for: Hybrid BM25 + vector search

**File Storage:**
- Local filesystem only
  - State directory: `~/.openclaw/` (configurable via `OPENCLAW_STATE_DIR`)
  - Contains: Sessions, memory files, configuration, transcripts
  - Implementation: `src/config/paths.ts`, `src/pairing/pairing-store.ts`

**Caching:**
- In-memory caching (no external cache service)
- Session-based caching for agent state
- File system watcher for cache invalidation

## Authentication & Identity

**Auth Providers:**
- Custom implementation (no external auth service)
  - Gateway token: `OPENCLAW_GATEWAY_TOKEN`
  - Gateway password: `OPENCLAW_GATEWAY_PASSWORD`
  - Implementation: `src/security/audit.ts`, `src/gateway/server-http.ts`

- OAuth support for:
  - Anthropic: `ANTHROPIC_OAUTH_TOKEN`
  - GitHub Copilot: Token-based
  - Qwen Portal: OAuth flow

**Session Management:**
- File-based session storage
- QR code pairing for WhatsApp
- Token-based for messaging platforms
- Implementation: `src/sessions/`, `src/pairing/`

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Rollbar, etc.)
- Local error logging only

**Logs:**
- Console-based logging with tslog
- Structured logging via `src/logging/`
- Log levels: debug, info, warn, error
- Implementation: `src/logger.ts`, `src/logging.ts`
- Color output controlled by `FORCE_COLOR` and `NO_COLOR` env vars

**Metrics:**
- Provider usage tracking
  - Implementation: `src/infra/provider-usage.ts`
  - Tracks: API calls, tokens, costs per provider
  - Providers tracked: Anthropic, OpenAI, Gemini, Groq, Minimax, Copilot, Qwen

## CI/CD & Deployment

**Hosting:**
- Fly.io (primary)
  - Config: `fly.toml`
  - Region: iad (configurable)
  - VM: shared-cpu-2x, 2048mb RAM
  - Persistent volume: `/data` mount

- Render (alternative)
  - Config: `render.yaml`

- Docker (containerized)
  - Dockerfile: `Dockerfile` (Node.js 22 + Bun)
  - Sandbox: `Dockerfile.sandbox`, `Dockerfile.sandbox-browser`

**CI Pipeline:**
- GitHub Actions (workflows in `.github/`)
  - Linting: oxlint, swiftlint
  - Testing: vitest, E2E tests
  - Dependabot: Automated dependency updates
  - Pre-commit hooks: `.pre-commit-config.yaml`

**Build Process:**
- TypeScript compilation: `tsc`
- UI build: Rolldown bundler
- Canvas/A2UI bundling: Custom scripts
- Protocol generation: `scripts/protocol-gen.ts`

## Environment Configuration

**Required Environment Variables:**
- `OPENAI_API_KEY` - For OpenAI models
- `ANTHROPIC_API_KEY` or `ANTHROPIC_OAUTH_TOKEN` - For Claude models
- `TELEGRAM_BOT_TOKEN` - For Telegram integration
- `DISCORD_BOT_TOKEN` - For Discord integration
- `SLACK_BOT_TOKEN` - For Slack bot
- `OPENCLAW_GATEWAY_TOKEN` - For gateway authentication

**Optional Environment Variables:**
- `GEMINI_API_KEY` - For Google Gemini
- `GROQ_API_KEY` - For Groq
- `DEEPGRAM_API_KEY` - For speech-to-text
- `ELEVENLABS_API_KEY` - For text-to-speech
- `MINIMAX_API_KEY` - For Minimax
- `OPENROUTER_API_KEY` - For OpenRouter
- `LARK_APP_ID`, `LARK_APP_SECRET` - For Lark
- `OPENCLAW_STATE_DIR` - Custom state directory
- `NODE_ENV` - Environment mode
- `OPENCLAW_GATEWAY_PASSWORD` - Gateway password

**Secrets Location:**
- `.env` file (local development)
- Environment variables (production)
- Shell environment fallback: `src/infra/shell-env.ts`
- Secrets baseline: `.secrets.baseline` (for secret detection)

## Webhooks & Callbacks

**Incoming:**
- Gateway HTTP endpoints: `src/gateway/server-http.ts`
  - Webhook receivers for messaging platforms
  - REST API for agent interaction

**Outgoing:**
- Messaging platform callbacks (WhatsApp, Telegram, Discord, Slack, LINE, Lark)
- No external webhook delivery detected

## Integration Patterns

**Provider Usage Tracking:**
- Centralized provider usage system: `src/infra/provider-usage.ts`
- Fetches usage from multiple providers:
  - Anthropic: `src/infra/provider-usage.fetch.claude.ts`
  - OpenAI: `src/infra/provider-usage.fetch.ts`
  - Google: `src/infra/provider-usage.fetch.gemini.ts`
  - Groq: `src/infra/provider-usage.fetch.ts`
  - Minimax: `src/infra/provider-usage.fetch.minimax.ts`
  - Copilot: `src/infra/provider-usage.fetch.copilot.ts`
  - Qwen: `src/infra/provider-usage.fetch.qwen.ts`

**Channel Plugin System:**
- Plugin-based architecture: `src/channels/plugins/`
- Allows custom channel implementations
- Plugin registry: `src/channels/registry.ts`

**Memory & Embeddings:**
- Hybrid search: BM25 keyword + vector semantic search
- Embedding providers: OpenAI, Google Gemini, Anthropic
- Vector storage: SQLite with sqlite-vec extension
- Implementation: `src/memory/manager.ts`, `src/memory/hybrid.ts`

---

*Integration audit: 2026-02-02*
