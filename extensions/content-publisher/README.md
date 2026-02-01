# Content Publisher Extension

Publish content to social media platforms using OpenClaw's browser automation.

## Supported Platforms

| Platform | Status | Content Types |
|----------|--------|---------------|
| 小红书 (Xiaohongshu) | ✅ Ready | Image posts |
| 抖音 (Douyin) | 🚧 Planned | Video posts |
| 微博 (Weibo) | 🚧 Planned | Text, Image |
| Twitter/X | 🚧 Planned | Text, Image |

## Installation

```bash
# Enable the extension
openclaw plugins enable content-publisher
```

## Configuration

Add to your `~/.openclaw/openclaw.json`:

```json5
{
  "plugins": {
    "entries": {
      "content-publisher": {
        "enabled": true,
        "config": {
          "defaultProfile": "social",  // Browser profile to use
          "platforms": {
            "xiaohongshu": {
              "enabled": true,
              "autoSubmit": false  // Set true to auto-click publish
            }
          },
          "defaultTimeout": 120000
        }
      }
    }
  },
  // Allow the tools for your agent
  "agents": {
    "list": [{
      "id": "main",
      "tools": {
        "allow": ["content-publisher"]
      }
    }]
  }
}
```

## Tools

### platform_status

Check if you're logged in to a platform.

```
Agent: Check my Xiaohongshu login status
```

**Parameters:**
- `platform` (required): Platform ID (`xiaohongshu`)
- `profile` (optional): Browser profile to use

### content_publish

Publish content to a platform.

```
Agent: Post to Xiaohongshu with title "My Post", content "Hello world!", and image /path/to/image.jpg
```

**Parameters:**
- `platform` (required): Target platform
- `content` (required): Main text content
- `title` (optional): Post title (max 20 chars for Xiaohongshu)
- `images` (optional): Array of images
  - `type`: `url`, `path`, or `base64`
  - `value`: The URL, file path, or base64 data
- `tags` (optional): Array of tags (without # prefix)
- `autoSubmit` (optional): Auto-click publish button (default: false)
- `draft` (optional): Save as draft instead

## Usage Examples

### Check Login Status

```bash
openclaw agent --message "Check if I'm logged in to Xiaohongshu"
```

### Publish with Local Image

```bash
openclaw agent --message "Post to Xiaohongshu: title '测试标题', content '这是测试内容', image /tmp/test.jpg"
```

### Publish with URL Image

```bash
openclaw agent --message "Post to Xiaohongshu with title '分享', content '好看的图片', image from https://example.com/image.jpg"
```

### Publish with Tags

```bash
openclaw agent --message "Post to Xiaohongshu: title '美食分享', content '今天做的菜', image /tmp/food.jpg, tags: 美食, 烹饪, 家常菜"
```

## Browser Setup

### First-time Setup

1. Start the browser:
   ```bash
   openclaw browser --browser-profile social start
   ```

2. Login to the platform manually:
   ```bash
   openclaw browser --browser-profile social open https://creator.xiaohongshu.com
   ```

3. Complete login in the browser window

4. Your session will be saved in the profile

### Using Chrome Extension (Alternative)

If you prefer using your existing Chrome with saved logins:

1. Install the OpenClaw Chrome extension
2. Use `profile: "chrome"` in your config
3. Attach the extension to your Xiaohongshu tab

## Platform-Specific Notes

### 小红书 (Xiaohongshu)

- **Images required**: At least 1 image is mandatory
- **Title limit**: Maximum 20 characters
- **Content limit**: Maximum 1000 characters
- **Max images**: 18 images per post
- **Tags**: Will show suggestions, auto-selects first match

**Publish URL**: https://creator.xiaohongshu.com/publish/publish

## Troubleshooting

### "Not logged in" Error

1. Start the browser manually:
   ```bash
   openclaw browser --browser-profile social start
   ```

2. Navigate to login page:
   ```bash
   openclaw browser --browser-profile social open https://creator.xiaohongshu.com
   ```

3. Login manually in the browser window

4. Try publishing again

### "Browser request failed" Error

Make sure the OpenClaw gateway is running:
```bash
openclaw gateway status
```

### Images Not Uploading

- Check file paths are absolute
- Verify image format (JPEG, PNG, WebP supported)
- Check file size (max 20MB per image)

## Development

### Adding a New Platform

1. Create adapter in `src/platforms/<platform>/`
2. Implement `PlatformAdapter` interface
3. Register in `src/platforms/registry.ts`

### Testing

```bash
# Run from extension directory
cd extensions/content-publisher
pnpm test
```

## License

MIT
