---
name: img-gen
command: img-gen
description: Generate images via Doubao (豆包) Seedream API.
homepage: https://www.volcengine.com/docs/6791/1298796
metadata: {"openclaw":{"emoji":"🍌","requires":{"bins":["uv"],"env":["ARK_API_KEY"]},"primaryEnv":"ARK_API_KEY","install":[{"id":"uv-brew","kind":"brew","formula":"uv","bins":["uv"],"label":"Install uv (brew)"}]}}
---

# Image Generation (Doubao 豆包)

Generate images via Doubao (豆包) Seedream API. Supports multiple resolutions (1K/2K/4K).

## Quick start

Generate (default 2K):
```bash
uv run {baseDir}/scripts/generate_image.py \
  --prompt "your image description" \
  --filename "output.png"
```

Generate with 4K resolution:
```bash
uv run {baseDir}/scripts/generate_image.py \
  --prompt "星际穿越，黑洞，电影大片" \
  --filename "space.png" \
  --size "4K"
```

## Options

- `--prompt` / `-p` - prompt text (required)
- `--filename` / `-f` - output filename (required)
- `--model` - model id (default: `doubao-seedream-4-0-250828`)
- `--api-key` / `-k` - API key (overrides `ARK_API_KEY` / `DOUBAO_API_KEY`)
- `--base-url` - base URL (default: `https://ark.cn-beijing.volces.com`)
- `--size` - image size: `1K`, `2K`, `4K` (default: `2K`)
- `--watermark` - add watermark
- `--no-watermark` - disable watermark (default)

## Supported Resolutions

- **1K**: 1024x1024
- **2K**: 2048x2048 (default)
- **4K**: 4096x4096

## Multi-step Workflows

When using generated images in subsequent steps (e.g., resizing, cropping), extract the actual file path from the script output:

```bash
# Step 1: Generate image and capture output
output=$(uv run {baseDir}/scripts/generate_image.py \
  --prompt "your description" \
  --filename "base.png" \
  --size "2K")

# Step 2: Extract the actual file path (with timestamp)
generated_file=$(echo "$output" | grep "OUTPUT_FILE:" | cut -d' ' -f2)

# Step 3: Use the file in subsequent operations
magick "$generated_file" -resize 957x1278^ -gravity center -extent 957x1278 output_final.jpg
```

The script outputs three lines for each generated image:
- `Image saved: /path/to/file_TIMESTAMP.png` - Human-readable message
- `MEDIA: /path/to/file_TIMESTAMP.png` - For OpenClaw auto-attachment
- `OUTPUT_FILE: /path/to/file_TIMESTAMP.png` - For programmatic use in workflows

## Notes

- Requires `ARK_API_KEY` or `DOUBAO_API_KEY` environment variable
- Uses Doubao (豆包) Seedream API endpoint
- Generated files include timestamps (e.g., `filename_20260130_173804.png`)
- The script prints `MEDIA:` and `OUTPUT_FILE:` lines for easy integration
- Do not read the image back; report the saved path only
- Default size is 2K if not specified
- Watermark is disabled by default (use `--watermark` to enable)

