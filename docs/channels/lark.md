# Lark (Feishu) Channel

Lark (飞书) is a collaboration platform from ByteDance. The Lark channel plugin allows OpenClaw to connect to Lark workspaces via the official Lark Open Platform.

## Features

- **WebSocket Long Connection**: Real-time message delivery with no public IP required
- **Direct Messages (DM)**: One-on-one conversations
- **Group Chats**: Group conversations
- **Thread Support**: Reply in threads
- **Rich Text**: Text and image messages
- **Message Chunking**: Automatic text splitting for long messages

## Setup

### 1. Create a Lark App

1. Visit [Lark Open Platform](https://open.larksuite.com/)
2. Create a new app (Self-Built App)
3. Note your **App ID** and **App Secret**
4. Enable **Event Subscriptions** and add the `im.message.receive_v1` event
5. (Optional) Set **Encrypt Key** and **Verification Token** for event validation

### 2. Configure OpenClaw

Add the following to your `~/.openclaw/config.toml`:

```toml
[channels.lark.accounts.default]
enabled = true
name = "My Lark Bot"
appId = "cli_xxx"
appSecret = "xxx"
# Optional: for event encryption
encryptKey = "xxx"
verificationToken = "xxx"
# Optional: allowlist
allowFrom = ["ou_xxx", "ou_yyy"]
```

Or use environment variables:

```bash
export LARK_APP_ID="cli_xxx"
export LARK_APP_SECRET="xxx"
```

### 3. Start the Gateway

```bash
openclaw gateway run
```

The Lark channel will automatically connect via WebSocket long connection.

## Configuration

### Account Options

| Option | Type | Description |
|--------|------|-------------|
| `enabled` | boolean | Enable/disable this account |
| `name` | string | Display name for this account |
| `appId` | string | Lark App ID (starts with `cli_`) |
| `appSecret` | string | Lark App Secret |
| `encryptKey` | string | Optional: Encrypt Key for event validation |
| `verificationToken` | string | Optional: Verification Token |
| `allowFrom` | array | Allowlist of user IDs for DMs |
| `groupAllowFrom` | array | Allowlist of user IDs for group chats |

### User ID Formats

Lark supports multiple user ID formats:

- **Open ID**: `ou_xxx` (recommended)
- **User ID**: Direct user ID
- **Union ID**: `on_xxx`
- **Email**: `user@example.com`

## Message Types

### Text Messages

Plain text messages are sent by default:

```bash
openclaw message send lark:oc_xxx "Hello from OpenClaw!"
```

### Images

Send images with media URLs:

```bash
openclaw message send lark:oc_xxx "Check this out" --media-url https://example.com/image.png
```

## Allowlist

Control who can interact with the bot:

```toml
[channels.lark.accounts.default]
# DM allowlist
allowFrom = ["ou_user1", "ou_user2", "*"]

# Group chat allowlist (by sender)
groupAllowFrom = ["ou_admin1", "*"]
```

## Troubleshooting

### Connection Issues

```bash
# Test connection
openclaw channels status lark --probe

# Check logs
tail -f ~/.openclaw/logs/gateway.log
```

### Common Errors

**"App ID and App Secret are required"**
- Ensure `appId` and `appSecret` are set in config or environment variables

**"Failed to obtain tenant access token"**
- Verify your App ID and App Secret are correct
- Check that your app is enabled in Lark Open Platform

**"Blocked message from user (not in allowlist)"**
- Add the user's Open ID to `allowFrom` or `groupAllowFrom`

## Links

- [Lark Open Platform](https://open.larksuite.com/)
- [Lark API Documentation](https://open.larksuite.com/document/)
