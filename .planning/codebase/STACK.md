# Technology Stack

**Analysis Date:** 2026-02-02

## Languages

**Primary:**
- TypeScript 5.9.3 - Main application language, used throughout `src/`
- JavaScript (Node.js) - Runtime and build scripts
- Swift - iOS/macOS native apps in `apps/ios/` and `apps/macos/`
- Kotlin - Android native app in `apps/android/`
- Shell - Build and deployment scripts

**Secondary:**
- HTML/CSS - Web UI in `ui/` directory
- YAML - Configuration files (`.github/`, `fly.toml`, `render.yaml`)

## Runtime

**Environment:**
- Node.js 22.12.0+ (specified in `package.json` engines)
- Bun (optional, for build scripts - installed in Docker)

**Package Manager:**
- pnpm 10.23.0 (specified in `package.json` packageManager)
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**
- Hono 4.11.4 - HTTP server framework for gateway and API routes
- Express 5.2.1 - Alternative HTTP framework for web server
- Commander 14.0.2 - CLI argument parsing and command structure

**Messaging/Channels:**
- @whiskeysockets/baileys 7.0.0-rc.9 - WhatsApp gateway (Baileys web)
- grammy 1.39.3 - Telegram bot framework
- @slack/bolt 4.6.0 - Slack bot framework
- @slack/web-api 7.13.0 - Slack API client
- @line/bot-sdk 10.6.0 - LINE messaging platform SDK
- @larksuiteoapi/node-sdk 1.56.1 - Lark (DingTalk) SDK
- discord-api-types 0.38.37 - Discord API type definitions

**AI/LLM Integration:**
- @mariozechner/pi-agent-core 0.50.7 - Pi agent framework
- @mariozechner/pi-ai 0.50.7 - Pi AI models
- @mariozechner/pi-coding-agent 0.50.7 - Pi coding agent
- @aws-sdk/client-bedrock 3.975.0 - AWS Bedrock LLM access

**Testing:**
- vitest 4.0.18 - Test runner and framework
- @vitest/coverage-v8 4.0.18 - Code coverage provider

**Build/Dev:**
- TypeScript 5.9.3 - Type checking and compilation
- oxlint 1.41.0 - Fast linter (Rust-based)
- oxfmt 0.26.0 - Code formatter (Rust-based)
- tsx 4.21.0 - TypeScript execution for scripts
- rolldown 1.0.0-rc.1 - Bundler for UI assets
- wireit 0.14.12 - Task orchestration

**Browser/Automation:**
- playwright-core 1.58.0 - Browser automation (headless)
- chromium-bidi 13.0.1 - Chrome DevTools Protocol

## Key Dependencies

**Critical:**
- zod 4.3.6 - Runtime schema validation and type inference
- ajv 8.17.1 - JSON Schema validator
- @sinclair/typebox 0.34.47 - JSON Schema builder
- dotenv 17.2.3 - Environment variable loading

**Media & Content:**
- sharp 0.34.5 - Image processing and optimization
- pdfjs-dist 5.4.530 - PDF parsing and rendering
- @mozilla/readability 0.6.0 - Article content extraction
- markdown-it 14.1.0 - Markdown parser
- jszip 3.10.1 - ZIP file handling
- file-type 21.3.0 - File type detection

**Infrastructure:**
- sqlite-vec 0.1.7-alpha.2 - Vector search extension for SQLite
- node:sqlite (built-in) - SQLite database (Node.js 22+)
- chokidar 5.0.0 - File system watcher
- proper-lockfile 4.1.2 - File locking mechanism
- croner 9.1.0 - Cron job scheduling

**Networking & Communication:**
- ws 8.19.0 - WebSocket implementation
- undici 7.19.0 - HTTP client (Node.js native)
- body-parser 2.2.2 - HTTP request body parsing
- @clack/prompts 0.11.0 - Interactive CLI prompts

**Utilities:**
- chalk 5.6.2 - Terminal color output
- tslog 4.10.2 - Structured logging
- yaml 2.8.2 - YAML parsing
- json5 2.2.3 - JSON5 parsing (comments support)
- linkedom 0.18.12 - DOM implementation for Node.js
- long 5.3.2 - 64-bit integer handling

**Optional:**
- @napi-rs/canvas 0.1.88 - Canvas rendering (optional, for image generation)
- node-llama-cpp 3.15.0 - Local LLM inference (optional)

## Configuration

**Environment:**
- Configuration via `.env` file (example: `.env.example`)
- Environment variables for API keys and secrets
- Shell environment fallback for sensitive values
- Config file: `openclaw.json5` or `openclaw.yaml` (JSON5/YAML format)

**Key Environment Variables:**
- `OPENAI_API_KEY` - OpenAI API authentication
- `ANTHROPIC_API_KEY` - Anthropic API key
- `ANTHROPIC_OAUTH_TOKEN` - Anthropic OAuth token
- `GEMINI_API_KEY` - Google Gemini API key
- `GROQ_API_KEY` - Groq API key
- `DEEPGRAM_API_KEY` - Deepgram speech-to-text API
- `MINIMAX_API_KEY` - Minimax API key
- `ELEVENLABS_API_KEY` - ElevenLabs text-to-speech API
- `OPENROUTER_API_KEY` - OpenRouter API key
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `DISCORD_BOT_TOKEN` - Discord bot token
- `SLACK_BOT_TOKEN` - Slack bot token
- `SLACK_APP_TOKEN` - Slack app-level token
- `OPENCLAW_GATEWAY_TOKEN` - Gateway authentication token
- `OPENCLAW_GATEWAY_PASSWORD` - Gateway password
- `LARK_APP_ID` - Lark app ID
- `LARK_APP_SECRET` - Lark app secret
- `OPENCLAW_STATE_DIR` - State directory (default: `~/.openclaw`)
- `NODE_ENV` - Environment mode (production/development)

**Build Configuration:**
- `tsconfig.json` - TypeScript compiler options
- `.oxlintrc.json` - Oxlint configuration
- `.oxfmtrc.jsonc` - Oxfmt configuration
- `vitest.config.ts` - Vitest test runner config
- `vitest.e2e.config.ts` - E2E test configuration
- `vitest.live.config.ts` - Live integration test configuration

## Platform Requirements

**Development:**
- Node.js 22.12.0 or higher
- pnpm 10.23.0
- macOS/Linux/Windows with bash support
- For iOS: Xcode, xcodegen
- For Android: Android SDK, Gradle
- For Swift linting: swiftlint, swiftformat

**Production:**
- Node.js 22+ runtime
- Docker (Dockerfile provided for containerization)
- Fly.io deployment support (fly.toml configured)
- Persistent storage for state directory (`/data` in Docker)
- 2GB RAM minimum (Fly.io: 2048mb configured)

**Deployment Targets:**
- Docker containers (Dockerfile, Dockerfile.sandbox, Dockerfile.sandbox-browser)
- Fly.io (fly.toml configured)
- Render (render.yaml configured)
- macOS app bundle (OpenClaw.app)
- iOS app (via Xcode)
- Android app (via Gradle)
- CLI tool (npm package)

---

*Stack analysis: 2026-02-02*
