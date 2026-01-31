---
name: img-gen
description: Generate or edit images via laozhang.ai (Nano Banana Pro - Google native format).
homepage: https://docs.laozhang.ai/api-capabilities/nano-banana-pro-image
metadata: {"openclaw":{"emoji":"🍌","requires":{"bins":["uv"],"env":["LAOZHANG_API_KEY"]},"primaryEnv":"LAOZHANG_API_KEY","install":[{"id":"uv-brew","kind":"brew","formula":"uv","bins":["uv"],"label":"Install uv (brew)"}]}}
---

# Image Generation (laozhang.ai)

Generate or edit images via laozhang.ai using Google native format API. Supports custom aspect ratios and high resolutions (1K/2K/4K).

## Quick start

Generate (default 1:1 square, 1K):
```bash
uv run {baseDir}/scripts/generate_image.py \
  --prompt "your image description" \
  --filename "output.png"
```

Generate with custom aspect ratio (3:4 vertical, 2K):
```bash
uv run {baseDir}/scripts/generate_image.py \
  --prompt "2026年春节红包封面，竖向构图，中国传统风格" \
  --filename "hongbao.png" \
  --aspect-ratio "3:4" \
  --image-size "2K"
```

Edit / compose (image inputs):
```bash
uv run {baseDir}/scripts/generate_image.py \
  --prompt "combine these images" \
  --filename "output.png" \
  -i img1.png -i img2.png
```

## Options

- `--prompt` / `-p` - prompt text (required)
- `--filename` / `-f` - output filename (required)
- `--model` - model id (default: `gemini-3-pro-image-preview`)
- `--input-image` / `-i` - input images (repeatable)
- `--api-key` / `-k` - API key (overrides `LAOZHANG_API_KEY` / `OPENROUTER_API_KEY`)
- `--base-url` - base URL (default: `https://api.laozhang.ai/v1`)
- `--aspect-ratio` - aspect ratio (e.g. `1:1`, `16:9`, `3:4`, `9:16`)
- `--image-size` - image size (e.g. `1K`, `2K`, `4K`)

## Supported Aspect Ratios

- **Horizontal**: `21:9`, `16:9`, `4:3`, `3:2`
- **Square**: `1:1` (default)
- **Vertical**: `9:16`, `3:4`, `2:3`
- **Other**: `5:4`, `4:5`

## Supported Resolutions

| Aspect Ratio | 1K | 2K | 4K |
|--------------|----|----|-----|
| 1:1 | 1024x1024 | 2048x2048 | 4096x4096 |
| 16:9 | 1376x768 | 2752x1536 | 5504x3072 |
| 9:16 | 768x1376 | 1536x2752 | 3072x5504 |
| 3:4 | 896x1200 | 1792x2400 | 3584x4800 |
| 4:3 | 1200x896 | 2400x1792 | 4800x3584 |

## Multi-step Workflows

When using generated images in subsequent steps (e.g., resizing, cropping), extract the actual file path from the script output:

```bash
# Step 1: Generate image and capture output
output=$(uv run {baseDir}/scripts/generate_image.py \
  --prompt "your description" \
  --filename "base.png" \
  --aspect-ratio "3:4" \
  --image-size "2K")

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

- Requires `LAOZHANG_API_KEY` (preferred) or `OPENROUTER_API_KEY`
- Uses Google native format API endpoint
- Generated files include timestamps (e.g., `filename_20260130_173804.png`)
- The script prints `MEDIA:` and `OUTPUT_FILE:` lines for easy integration
- Do not read the image back; report the saved path only
- Default aspect ratio is 1:1 if not specified
- Default image size is 1K if not specified
