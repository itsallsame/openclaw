---
name: video-edit
command: video-edit
description: LLM-scored highlight editing with Doubao ASR + ffmpeg (subtitles burned-in).
homepage: https://www.volcengine.com/docs/6561/1354869
metadata: {"openclaw":{"emoji":"✂️","requires":{"bins":["ffmpeg"],"anyBins":["codex","gemini","claude","opencode","pi"]},"install":[{"id":"brew-ffmpeg","kind":"brew","formula":"ffmpeg","bins":["ffmpeg"],"label":"Install ffmpeg (brew)"}]}}
---

# Video Edit (LLM highlight pipeline)

This skill takes a local video, transcribes it, uses an LLM to select highlight ranges, trims/concats those ranges, and burns subtitles into the final output. Each run writes results into its own run directory.

## IMPORTANT: Execution Instructions

**YOU MUST ONLY execute the edit.sh script. DO NOT try to execute transcribe.sh, video_cut.py, or any other scripts directly. The edit.sh script handles the complete pipeline automatically.**

**ALWAYS use this command pattern:**
```bash
{baseDir}/scripts/edit.sh [options]
```

## Required info (ask if missing)

Ask the user for these explicitly. Do not assume defaults.

- Input video path (local)
- Output path or directory (local)
- Target highlight duration (seconds, HH:MM:SS, or `auto` to let LLM decide)
- Content requirements prompt (natural language, e.g. conclusion, data, emotion, narrative)
- Subtitle mode: `auto` or a path to the final SRT (subtitles must be burned)

## Quick start

**Prerequisites**: Set Doubao ASR credentials as environment variables:

```bash
export DOUBAO_APP_ID="your_app_id_here"
export DOUBAO_ACCESS_TOKEN="your_access_token_here"
```

Get your credentials from [Volcengine Console](https://console.volcengine.com/speech/service/8).

Basic usage:

```bash
{baseDir}/scripts/edit.sh \
  --in /path/to/input.mp4 \
  --out /path/to/highlights.mp4 \
  --total-seconds auto \
  --prompt "conclusion,data" \
  --subtitles auto
```

Or with explicit duration:

```bash
{baseDir}/scripts/edit.sh \
  --in /path/to/input.mp4 \
  --out /path/to/highlights.mp4 \
  --total-seconds 60 \
  --prompt "conclusion,data" \
  --subtitles auto
```

Or output multiple separate videos:

```bash
{baseDir}/scripts/edit.sh \
  --in /path/to/input.mp4 \
  --out /path/to/highlights.mp4 \
  --total-seconds auto \
  --prompt "conclusion,data" \
  --subtitles auto \
  --output-mode separate
```

Note: The default LLM is `claude`. You can override with `--llm-cmd` if needed (e.g., `--llm-cmd "codex exec" --llm-model gpt-5.2-codex`).

## Options

- `--in /path/to/video.mp4` input video (required)
- `--out /path/to/output.mp4` output path or directory (required, results written to run directory)
- `--total-seconds 60|auto` target total highlight duration in seconds, HH:MM:SS format, or `auto` to let LLM decide (optional, defaults to auto if omitted)
- `--prompt "conclusion,data"` content requirements prompt (required)
- `--subtitles auto|/path/to/final.srt` subtitle mode (required)
- `--llm-cmd "codex exec"` LLM command to run (optional, defaults to `claude`)
- `--llm-model <name>` LLM model (optional)
- `--llm-args "..."` extra args passed to the LLM CLI (optional)
- `--doubao-language <lang>` Doubao language code (optional; omit or use `auto` for auto-detect, supports: en-US, ja-JP, zh-CN, etc.)
- `--subtitle-bilingual <lang>` add bilingual subtitles by translating each line to the target language (default: `zh`)
- `--no-bilingual` disable bilingual subtitles (single-language only)
- `--crf 23` video quality for final encode (optional)
- `--preset medium` x264 preset (optional)
- `--output-mode concat|separate` output mode: `concat` merges all clips into one video (default), `separate` outputs multiple independent videos (optional)
- `--run-dir /path/to/run` use a specific run directory (optional; enables reuse)
- `--resume` reuse cached artifacts in `--run-dir` (optional)

## Output

The script prints:
- The output file path
- A `MEDIA:` line so OpenClaw can auto-attach the video

## Notes

- **ASR Service**: Uses Doubao ASR (豆包语音识别) cloud service instead of local Whisper
- **Authentication**: Requires Doubao APP ID and Access Token (get from [Volcengine Console](https://console.volcengine.com/speech))
- LLM receives SRT segments and returns highlight ranges by `start_id`/`end_id`.
- **Auto mode**: When `--total-seconds auto` (or omitted), the LLM automatically determines the optimal highlight duration based on content quality and coherence. This is useful when you want the best segments without a strict time constraint.
- **Manual mode**: When `--total-seconds` is set to a specific value (e.g., `60` or `01:30:00`), the LLM will try to match that target duration as closely as possible.
- **Output modes**:
  - `concat` (default): All clips are merged into a single video with subtitles burned in.
  - `separate`: Each clip is saved as an independent video file with its own subtitles. Output files are named `{base}-01.mp4`, `{base}-02.mp4`, etc.
- When `--subtitles auto` is used, Doubao ASR runs to transcribe the video(s).
- With `--run-dir` + `--resume`, existing transcripts and LLM output are reused when present.
- If you supply `--subtitles /path/to/final.srt`, it must match the *final* concatenated video timeline (only works in concat mode).
- When `--subtitle-bilingual <lang>` is set, the final SRT is translated per segment using the same LLM command and then combined as two-line subtitles.
- **Language Support**: Doubao ASR supports 13 languages including Chinese dialects (Mandarin, Cantonese, Shanghainese, etc.), English, Japanese, Korean, and more.
