---
name: video-edit
description: LLM-scored highlight editing with Whisper + ffmpeg (subtitles burned-in).
homepage: https://ffmpeg.org
metadata: {"openclaw":{"emoji":"✂️","requires":{"bins":["ffmpeg","whisper"],"anyBins":["codex","gemini","claude","opencode","pi"]},"install":[{"id":"brew-ffmpeg","kind":"brew","formula":"ffmpeg","bins":["ffmpeg"],"label":"Install ffmpeg (brew)"},{"id":"brew-whisper","kind":"brew","formula":"openai-whisper","bins":["whisper"],"label":"Install OpenAI Whisper (brew)"}]}}
---

# Video Edit (LLM highlight pipeline)

This skill takes a local video, transcribes it, uses an LLM to select highlight ranges, trims/concats those ranges, and burns subtitles into the final output. Each run writes results into its own run directory.

## Required info (ask if missing)

Ask the user for these explicitly. Do not assume defaults.

- Input video path (local)
- Output path or directory (local)
- Target highlight duration (seconds, HH:MM:SS, or `auto` to let LLM decide)
- Content requirements (natural language, e.g. conclusion, data, emotion, narrative)
- Subtitle mode: `auto` or a path to the final SRT (subtitles must be burned)

## Quick start

```bash
{baseDir}/scripts/edit.sh \
  --in /path/to/input.mp4 \
  --out /path/to/highlights.mp4 \
  --total-seconds auto \
  --requirements "conclusion,data" \
  --subtitles auto \
  --whisper-model small
```

Or with explicit duration:

```bash
{baseDir}/scripts/edit.sh \
  --in /path/to/input.mp4 \
  --out /path/to/highlights.mp4 \
  --total-seconds 60 \
  --requirements "conclusion,data" \
  --subtitles auto \
  --whisper-model small
```

Or output multiple separate videos:

```bash
{baseDir}/scripts/edit.sh \
  --in /path/to/input.mp4 \
  --out /path/to/highlights.mp4 \
  --total-seconds auto \
  --requirements "conclusion,data" \
  --subtitles auto \
  --whisper-model small \
  --output-mode separate
```

Note: The default LLM is `claude`. You can override with `--llm-cmd` if needed (e.g., `--llm-cmd "codex exec" --llm-model gpt-5.2-codex`).

## Options

- `--in /path/to/video.mp4` input video (required)
- `--out /path/to/output.mp4` output path or directory (required, results written to run directory)
- `--total-seconds 60|auto` target total highlight duration in seconds, HH:MM:SS format, or `auto` to let LLM decide (optional, defaults to auto if omitted)
- `--requirements "conclusion,data"` content requirements (required)
- `--subtitles auto|/path/to/final.srt` subtitle mode (required)
- `--llm-cmd "codex exec"` LLM CLI to run (required)
- `--llm-model <name>` LLM model (optional)
- `--llm-args "..."` extra args passed to the LLM CLI (optional)
- `--whisper-model <name>` Whisper model (optional, recommend `small` on CPU for speed)
- `--whisper-language <lang>` Whisper language (optional; omit or use `auto` for auto-detect)
- `--whisper-task transcribe|translate` Whisper task (optional)
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

- LLM receives SRT segments and returns highlight ranges by `start_id`/`end_id`.
- **Auto mode**: When `--total-seconds auto` (or omitted), the LLM automatically determines the optimal highlight duration based on content quality and coherence. This is useful when you want the best segments without a strict time constraint.
- **Manual mode**: When `--total-seconds` is set to a specific value (e.g., `60` or `01:30:00`), the LLM will try to match that target duration as closely as possible.
- **Output modes**:
  - `concat` (default): All clips are merged into a single video with subtitles burned in.
  - `separate`: Each clip is saved as an independent video file with its own subtitles. Output files are named `{base}-01.mp4`, `{base}-02.mp4`, etc.
- When `--subtitles auto` is used, Whisper runs to transcribe the video(s).
- With `--run-dir` + `--resume`, existing transcripts and LLM output are reused when present.
- If you supply `--subtitles /path/to/final.srt`, it must match the *final* concatenated video timeline (only works in concat mode).
- When `--subtitle-bilingual <lang>` is set, the final SRT is translated per segment using the same LLM command and then combined as two-line subtitles.
