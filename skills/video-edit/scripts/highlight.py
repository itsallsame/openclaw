#!/usr/bin/env python3
import argparse
import json
import os
import re
import shlex
import subprocess
import sys
import time
import secrets
from dataclasses import dataclass
from typing import Iterable, List, Optional, Tuple


@dataclass
class Segment:
    id: int
    start: float
    end: float
    text: str


TIME_RE = re.compile(
    r"(?P<h>\d{2}):(?P<m>\d{2}):(?P<s>\d{2})[,.](?P<ms>\d{3})"
)
SRT_RANGE_RE = re.compile(
    r"(?P<start>\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(?P<end>\d{2}:\d{2}:\d{2}[,.]\d{3})"
)


def eprint(*args: str) -> None:
    print(*args, file=sys.stderr)


def parse_timestamp(value: str) -> float:
    match = TIME_RE.match(value.strip())
    if not match:
        raise ValueError(f"Invalid timestamp: {value}")
    h = int(match.group("h"))
    m = int(match.group("m"))
    s = int(match.group("s"))
    ms = int(match.group("ms"))
    return h * 3600 + m * 60 + s + ms / 1000.0


def format_timestamp(seconds: float) -> str:
    if seconds < 0:
        seconds = 0
    ms = int(round((seconds - int(seconds)) * 1000))
    total = int(seconds)
    h = total // 3600
    m = (total % 3600) // 60
    s = total % 60
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def format_timestamp_srt(seconds: float) -> str:
    return format_timestamp(seconds).replace(".", ",")


def parse_duration(value: str) -> float:
    value = value.strip()
    if value.isdigit():
        return float(value)
    if ":" in value:
        parts = value.split(":")
        if len(parts) == 2:
            h = 0
            m, s = parts
        elif len(parts) == 3:
            h, m, s = parts
        else:
            raise ValueError(f"Invalid duration: {value}")
        sec = float(s)
        return int(h) * 3600 + int(m) * 60 + sec
    raise ValueError(f"Invalid duration: {value}")


def parse_srt(path: str) -> List[Segment]:
    segments: List[Segment] = []
    with open(path, "r", encoding="utf-8", errors="ignore") as handle:
        block_lines: List[str] = []
        for line in handle:
            line = line.rstrip("\n")
            if not line.strip():
                if block_lines:
                    segment = parse_srt_block(block_lines)
                    if segment:
                        segments.append(segment)
                    block_lines = []
                continue
            block_lines.append(line)
        if block_lines:
            segment = parse_srt_block(block_lines)
            if segment:
                segments.append(segment)
    return segments


def parse_srt_block(lines: Iterable[str]) -> Optional[Segment]:
    lines = list(lines)
    if len(lines) < 2:
        return None
    time_line = lines[1] if lines[0].strip().isdigit() else lines[0]
    match = SRT_RANGE_RE.search(time_line)
    if not match:
        return None
    start = parse_timestamp(match.group("start"))
    end = parse_timestamp(match.group("end"))
    text_lines = []
    for line in lines:
        if SRT_RANGE_RE.search(line):
            continue
        if line.strip().isdigit():
            continue
        text_lines.append(line.strip())
    text = " ".join([t for t in text_lines if t])
    return Segment(id=0, start=start, end=end, text=text)


def reindex_segments(segments: List[Segment]) -> List[Segment]:
    output: List[Segment] = []
    for idx, seg in enumerate(segments, start=1):
        output.append(Segment(id=idx, start=seg.start, end=seg.end, text=seg.text))
    return output


def run_cmd(args: List[str]) -> None:
    subprocess.run(args, check=True)


def run_capture(args: List[str]) -> str:
    result = subprocess.run(args, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return result.stdout.strip()


def resolve_bin(name: str) -> str:
    env_key = f"{name.upper()}_BIN"
    env_value = os.environ.get(env_key)
    if env_value and os.path.isfile(env_value):
        return env_value
    brew_path = f"/opt/homebrew/opt/ffmpeg-full/bin/{name}"
    if os.path.isfile(brew_path):
        return brew_path
    return name


def find_video_duration(path: str) -> Optional[float]:
    try:
        output = run_capture(
            [
                resolve_bin("ffprobe"),
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=nk=1:nw=1",
                path,
            ]
        )
        return float(output)
    except Exception:
        return None


def build_prompt(segments: List[Segment], total_seconds: Optional[float], requirements: str) -> str:
    payload = {
        "goal": "select highlight segments",
        "requirements": requirements,
        "segments": [
            {
                "id": seg.id,
                "start": format_timestamp(seg.start),
                "end": format_timestamp(seg.end),
                "text": seg.text,
            }
            for seg in segments
        ],
    }

    if total_seconds is not None:
        payload["target_total_seconds"] = total_seconds
        duration_instruction = "Total duration should be close to target_total_seconds. "
    else:
        duration_instruction = (
            "Automatically determine the optimal total duration based on content quality. "
            "Select the most valuable segments that form a coherent narrative. "
        )

    payload_json = json.dumps(payload, ensure_ascii=True)
    instructions = (
        "You are a video editor. Select the best segments based on the content requirements below. "
        f"Content requirements: {requirements}. "
        "Return JSON only. Schema: {\"highlights\":[{\"start_id\":int,\"end_id\":int,"
        "\"score\":number,\"reason\":string,\"pad_before\":number,\"pad_after\":number}]}. "
        f"Choose non-overlapping ranges. {duration_instruction}"
        "Prefer coherent segments and avoid cutting mid-sentence."
    )
    return f"{instructions}\n\nINPUT_JSON={payload_json}"


def extract_json(text: str) -> dict:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("LLM did not return JSON.")
    return json.loads(text[start : end + 1])


def build_highlight_schema() -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "highlights": {
                "type": "array",
                "minItems": 1,
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "start_id": {"type": "integer"},
                        "end_id": {"type": "integer"},
                        "score": {"type": "number"},
                        "reason": {"type": "string"},
                        "pad_before": {"type": "number"},
                        "pad_after": {"type": "number"},
                    },
                    "required": [
                        "start_id",
                        "end_id",
                        "score",
                        "reason",
                        "pad_before",
                        "pad_after",
                    ],
                },
            }
        },
        "required": ["highlights"],
    }


def build_translation_schema() -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "translations": {
                "type": "array",
                "minItems": 1,
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "id": {"type": "integer"},
                        "text": {"type": "string"},
                    },
                    "required": ["id", "text"],
                },
            }
        },
        "required": ["translations"],
    }


def write_schema(workdir: str, schema: dict) -> str:
    schema_path = os.path.join(workdir, "highlight-schema.json")
    with open(schema_path, "w", encoding="utf-8") as handle:
        json.dump(schema, handle, ensure_ascii=True)
    return schema_path


def run_codex(
    prompt: str,
    cmd: List[str],
    llm_model: Optional[str],
    llm_args: Optional[str],
    workdir: str,
    schema: dict,
) -> dict:
    if "exec" not in cmd[1:]:
        cmd.insert(1, "exec")
    if llm_model:
        cmd += ["-m", llm_model]
    schema_path = write_schema(workdir, schema)
    output_path = os.path.join(workdir, "codex-output.json")
    cmd += ["--output-schema", schema_path, "--output-last-message", output_path, "--skip-git-repo-check"]
    if llm_args:
        cmd += shlex.split(llm_args)
    cmd.append(prompt)
    result = subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.stderr:
        eprint(result.stderr.strip())
    if os.path.isfile(output_path):
        with open(output_path, "r", encoding="utf-8") as handle:
            return extract_json(handle.read())
    return extract_json(result.stdout)


def run_gemini(prompt: str, cmd: List[str], llm_model: Optional[str], llm_args: Optional[str]) -> dict:
    cmd += ["--output-format", "json"]
    if llm_model:
        cmd += ["--model", llm_model]
    if llm_args:
        cmd += shlex.split(llm_args)
    cmd.append(prompt)
    result = subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.stderr:
        eprint(result.stderr.strip())
    return extract_json(result.stdout)


def call_llm(
    prompt: str,
    llm_cmd: str,
    llm_model: Optional[str],
    llm_args: Optional[str],
    workdir: str,
    schema: dict,
) -> dict:
    cmd = shlex.split(llm_cmd)
    if not cmd:
        raise ValueError("Empty --llm-cmd")
    base = os.path.basename(cmd[0])
    if base == "codex":
        return run_codex(prompt, cmd, llm_model, llm_args, workdir, schema)
    if base.startswith("gemini"):
        return run_gemini(prompt, cmd, llm_model, llm_args)
    if llm_args:
        cmd += shlex.split(llm_args)
    cmd.append(prompt)
    result = subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.stderr:
        eprint(result.stderr.strip())
    return extract_json(result.stdout)


def select_ranges(data: dict, segments: List[Segment]) -> List[dict]:
    highlights = data.get("highlights")
    if not isinstance(highlights, list) or not highlights:
        raise ValueError("LLM output missing highlights list.")
    by_id = {seg.id: seg for seg in segments}
    ranges = []
    for item in highlights:
        if not isinstance(item, dict):
            continue
        start_id = item.get("start_id")
        end_id = item.get("end_id")
        if not isinstance(start_id, int) or not isinstance(end_id, int):
            continue
        if start_id not in by_id or end_id not in by_id:
            continue
        if end_id < start_id:
            start_id, end_id = end_id, start_id
        start_seg = by_id[start_id]
        end_seg = by_id[end_id]
        pad_before = float(item.get("pad_before", 0))
        pad_after = float(item.get("pad_after", 0))
        ranges.append(
            {
                "start": start_seg.start - pad_before,
                "end": end_seg.end + pad_after,
                "score": float(item.get("score", 0)),
                "reason": str(item.get("reason", "")),
            }
        )
    if not ranges:
        raise ValueError("No valid highlight ranges produced.")
    return ranges


def build_translation_prompt(segments: List[Segment], target_language: str) -> str:
    payload = {
        "target_language": target_language,
        "segments": [{"id": seg.id, "text": seg.text} for seg in segments],
    }
    payload_json = json.dumps(payload, ensure_ascii=True)
    instructions = (
        "Return JSON only. Schema: {\"translations\":[{\"id\":int,\"text\":string}]}. "
        "Translate each segment text into target_language. Preserve meaning and proper nouns."
    )
    return f"{instructions}\n\nINPUT_JSON={payload_json}"


def translate_segments(
    segments: List[Segment],
    target_language: str,
    llm_cmd: str,
    llm_model: Optional[str],
    llm_args: Optional[str],
    workdir: str,
) -> dict:
    translations: dict[int, str] = {}
    chunk_size = 50
    for i in range(0, len(segments), chunk_size):
        chunk = segments[i : i + chunk_size]
        prompt = build_translation_prompt(chunk, target_language)
        data = call_llm(
            prompt,
            llm_cmd,
            llm_model,
            llm_args,
            workdir,
            build_translation_schema(),
        )
        items = data.get("translations")
        if not isinstance(items, list):
            continue
        for item in items:
            if not isinstance(item, dict):
                continue
            seg_id = item.get("id")
            text = item.get("text")
            if isinstance(seg_id, int) and isinstance(text, str):
                translations[seg_id] = text.strip()
    return translations


def write_srt(segments: List[Segment], output_path: str, translations: Optional[dict] = None) -> None:
    with open(output_path, "w", encoding="utf-8") as handle:
        for idx, seg in enumerate(segments, start=1):
            text = seg.text.strip()
            if translations is not None:
                translated = translations.get(seg.id, "")
                if translated:
                    text = f"{text}\n{translated}"
            handle.write(f"{idx}\n")
            handle.write(
                f"{format_timestamp_srt(seg.start)} --> {format_timestamp_srt(seg.end)}\n"
            )
            handle.write(f"{text}\n\n")


def merge_ranges(ranges: List[dict]) -> List[dict]:
    if not ranges:
        return []
    ranges = sorted(ranges, key=lambda r: r["start"])
    merged = [ranges[0]]
    for item in ranges[1:]:
        last = merged[-1]
        if item["start"] <= last["end"]:
            last["end"] = max(last["end"], item["end"])
            last["score"] = max(last["score"], item.get("score", 0))
            if item.get("reason"):
                last["reason"] = last.get("reason", "") or item["reason"]
        else:
            merged.append(item)
    return merged


def ensure_parent_dir(path: str) -> None:
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)


def read_json_file(path: str) -> Optional[dict]:
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:
        return None


def write_json_file(path: str, data: dict) -> None:
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=True)


def create_run_dir(output_dir: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    for _ in range(5):
        stamp = time.strftime("%Y%m%d-%H%M%S")
        token = secrets.token_hex(3)
        run_dir = os.path.join(
            output_dir,
            f"openclaw-video-edit-{stamp}-{os.getpid()}-{token}",
        )
        try:
            os.makedirs(run_dir, exist_ok=False)
            return run_dir
        except FileExistsError:
            continue
    raise RuntimeError("Unable to create a unique run directory.")


def clip_segments(input_path: str, ranges: List[dict], workdir: str) -> List[str]:
    clips: List[str] = []
    for idx, item in enumerate(ranges, start=1):
        start = max(0.0, item["start"])
        end = max(start + 0.1, item["end"])
        duration = max(0.1, end - start)
        clip_path = os.path.join(workdir, f"clip-{idx:02d}.mp4")
        run_cmd(
            [
                resolve_bin("ffmpeg"),
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-ss",
                format_timestamp(start),
                "-i",
                input_path,
                "-t",
                f"{duration:.3f}",
                "-c",
                "copy",
                clip_path,
            ]
        )
        clips.append(clip_path)
    return clips


def concat_clips(clips: List[str], output_path: str, workdir: str) -> None:
    list_path = os.path.join(workdir, "concat.txt")
    with open(list_path, "w", encoding="utf-8") as handle:
        for clip in clips:
            esc = clip.replace("'", "'\\''")
            handle.write(f"file '{esc}'\n")
    run_cmd(
        [
            resolve_bin("ffmpeg"),
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            list_path,
            "-c",
            "copy",
            output_path,
        ]
    )


def has_ffmpeg_filter(name: str) -> bool:
    try:
        output = run_capture([resolve_bin("ffmpeg"), "-hide_banner", "-filters"])
    except Exception:
        return False
    pattern = re.compile(rf"\b{name}\b")
    return any(pattern.search(line) for line in output.splitlines())


def burn_subtitles(input_path: str, srt_path: str, output_path: str, crf: str, preset: str) -> None:
    if not has_ffmpeg_filter("subtitles"):
        raise RuntimeError(
            "ffmpeg build lacks the subtitles filter (libass). "
            "Install ffmpeg with libass support to burn subtitles."
        )
    esc = srt_path.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
    vf = f"subtitles=filename='{esc}'"
    run_cmd(
        [
            resolve_bin("ffmpeg"),
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            input_path,
            "-vf",
            vf,
            "-c:v",
            "libx264",
            "-preset",
            preset,
            "-crf",
            crf,
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            output_path,
        ]
    )


def run_whisper(input_path: str, output_dir: str, model: Optional[str], language: Optional[str], task: Optional[str]) -> str:
    args = ["whisper", input_path, "--output_format", "srt", "--output_dir", output_dir]
    if model:
        args += ["--model", model]
    if language:
        args += ["--language", language]
    if task:
        args += ["--task", task]
    run_cmd(args)
    base = os.path.basename(input_path)
    srt_path = os.path.join(output_dir, f"{os.path.splitext(base)[0]}.srt")
    if not os.path.isfile(srt_path):
        raise FileNotFoundError(f"Whisper did not output {srt_path}")
    return srt_path


def process_separate_mode(
    clips: List[str],
    output_base: str,
    whisper_model: Optional[str],
    whisper_language: Optional[str],
    whisper_task: Optional[str],
    subtitle_bilingual: str,
    llm_cmd: str,
    llm_model: Optional[str],
    llm_args: Optional[str],
    crf: str,
    preset: str,
    tmpdir: str,
) -> List[str]:
    """Process clips in separate mode: each clip gets its own subtitles and output file."""
    output_files = []
    base_name = os.path.splitext(output_base)[0]
    ext = os.path.splitext(output_base)[1] or ".mp4"

    for idx, clip in enumerate(clips, 1):
        eprint(f"Processing clip {idx}/{len(clips)}...")

        # Generate output filename
        output_file = f"{base_name}-{idx:02d}{ext}"

        # Transcribe this clip
        clip_srt = run_whisper(clip, tmpdir, whisper_model, whisper_language, whisper_task)

        # Handle bilingual subtitles if needed
        if subtitle_bilingual:
            clip_segments = reindex_segments(parse_srt(clip_srt))
            if clip_segments:
                translations = translate_segments(
                    clip_segments,
                    subtitle_bilingual,
                    llm_cmd,
                    llm_model,
                    llm_args,
                    tmpdir,
                )
                bilingual_srt = os.path.join(tmpdir, f"bilingual-{idx:02d}.srt")
                write_srt(clip_segments, bilingual_srt, translations)
                clip_srt = bilingual_srt

        # Burn subtitles
        burn_subtitles(clip, clip_srt, output_file, crf, preset)
        output_files.append(output_file)
        eprint(f"  Created: {output_file}")

    return output_files


def main() -> int:
    parser = argparse.ArgumentParser(description="Select highlights with an LLM and assemble a subtitled clip.")
    parser.add_argument("--in", dest="input_path", help="Input video path")
    parser.add_argument("--out", dest="output_path", help="Output path or directory")
    parser.add_argument("--run-dir", dest="run_dir", help="Reuse or set a specific run directory")
    parser.add_argument("--resume", action="store_true", help="Reuse cached artifacts in --run-dir")
    parser.add_argument("--total-seconds", dest="total_seconds", help="Target highlight total duration (seconds, HH:MM:SS, or 'auto' for LLM to decide)")
    parser.add_argument(
        "--requirements",
        dest="requirements",
        help="Content requirements (natural language, e.g. conclusion, data, emotion)",
    )
    parser.add_argument("--subtitles", dest="subtitles", help="Subtitle mode: auto or path to final SRT")
    parser.add_argument("--llm-cmd", dest="llm_cmd", default="", help="LLM command to run (e.g. codex exec)")
    parser.add_argument("--llm-model", dest="llm_model", default="", help="LLM model name")
    parser.add_argument("--llm-args", dest="llm_args", default="", help="Extra args passed to LLM command")
    parser.add_argument("--whisper-model", dest="whisper_model", default="", help="Whisper model")
    parser.add_argument("--whisper-language", dest="whisper_language", default="", help="Whisper language (omit for auto-detect)")
    parser.add_argument("--whisper-task", dest="whisper_task", default="", help="Whisper task: transcribe|translate")
    parser.add_argument(
        "--subtitle-bilingual",
        dest="subtitle_bilingual",
        default="zh",
        help="Add bilingual subtitles by translating each line to target language (e.g. zh)",
    )
    parser.add_argument(
        "--no-bilingual",
        dest="no_bilingual",
        action="store_true",
        help="Disable bilingual subtitles (use single-language subtitles only)",
    )
    parser.add_argument("--crf", dest="crf", default="23", help="CRF for subtitle burn")
    parser.add_argument("--preset", dest="preset", default="medium", help="x264 preset for subtitle burn")
    parser.add_argument("--output-mode", dest="output_mode", default="concat", choices=["concat", "separate"], help="Output mode: concat (single video) or separate (multiple videos)")
    args = parser.parse_args()

    missing = []
    if not args.input_path:
        missing.append("--in")
    if not args.output_path:
        missing.append("--out")
    if not args.requirements:
        missing.append("--requirements")
    if not args.subtitles:
        missing.append("--subtitles")
    if missing:
        eprint("Missing required args:", ", ".join(missing))
        return 2

    input_path = os.path.abspath(args.input_path)
    output_path = os.path.abspath(args.output_path)
    if not os.path.isfile(input_path):
        eprint(f"Input file not found: {input_path}")
        return 1

    if not args.llm_cmd:
        args.llm_cmd = "claude"

    # Normalize whisper language: treat "auto" as unset
    if args.whisper_language and args.whisper_language.strip().lower() == "auto":
        args.whisper_language = ""

    # Parse total_seconds: support 'auto' or explicit duration
    total_seconds: Optional[float] = None
    if args.total_seconds:
        if args.total_seconds.strip().lower() == "auto":
            total_seconds = None  # Let LLM decide
            eprint("Auto mode: LLM will determine optimal highlight duration")
        else:
            try:
                total_seconds = parse_duration(args.total_seconds)
            except ValueError as exc:
                eprint(str(exc))
                return 2

    output_is_dir = False
    if args.output_path.endswith(os.sep) or args.output_path.endswith("/"):
        output_is_dir = True
    if os.path.isdir(output_path):
        output_is_dir = True
    if not output_is_dir and not os.path.splitext(output_path)[1]:
        output_is_dir = True

    if args.resume and not args.run_dir:
        eprint("--resume requires --run-dir")
        return 2

    output_name = "highlights.mp4" if output_is_dir else os.path.basename(output_path)
    if args.run_dir:
        run_dir = os.path.abspath(args.run_dir)
        os.makedirs(run_dir, exist_ok=True)
    else:
        output_dir = output_path if output_is_dir else os.path.dirname(output_path)
        output_dir = output_dir or os.getcwd()
        run_dir = create_run_dir(output_dir)

    output_path = os.path.join(run_dir, output_name)

    ensure_parent_dir(output_path)

    tmpdir = run_dir
    try:
        eprint("Starting video processing...")
        transcript_name = f"{os.path.splitext(os.path.basename(input_path))[0]}.srt"
        transcript_srt = os.path.join(tmpdir, transcript_name)
        if args.resume and os.path.isfile(transcript_srt):
            eprint(f"Reusing transcript: {transcript_srt}")
        else:
            eprint("Transcribing original video...")
            transcript_srt = run_whisper(
                input_path,
                tmpdir,
                args.whisper_model or None,
                args.whisper_language or None,
                args.whisper_task or None,
            )
        segments = reindex_segments(parse_srt(transcript_srt))
        if not segments:
            eprint("No segments parsed from transcript.")
            return 1

        eprint("Selecting highlight segments...")
        prompt = build_prompt(segments, total_seconds, args.requirements)
        llm_output_path = os.path.join(tmpdir, "llm-output.json")
        llm_output = read_json_file(llm_output_path) if args.resume else None
        if llm_output:
            eprint(f"Reusing LLM output: {llm_output_path}")
        else:
            llm_output = call_llm(
                prompt,
                args.llm_cmd,
                args.llm_model or None,
                args.llm_args or None,
                tmpdir,
                build_highlight_schema(),
            )
            write_json_file(llm_output_path, llm_output)
        ranges = merge_ranges(select_ranges(llm_output, segments))
        if not ranges:
            eprint("LLM produced no usable ranges.")
            return 1

        video_duration = find_video_duration(input_path)
        for item in ranges:
            if video_duration is not None:
                item["start"] = max(0.0, min(item["start"], video_duration))
                item["end"] = max(0.0, min(item["end"], video_duration))

        eprint("Clipping segments...")
        clips = clip_segments(input_path, ranges, tmpdir)
        if not clips:
            eprint("No clips produced.")
            return 1

        # Check output mode
        if args.output_mode == "separate":
            # Separate mode: process each clip individually
            eprint(f"Output mode: separate ({len(clips)} clips)")
            subtitle_bilingual = "" if args.no_bilingual else args.subtitle_bilingual
            output_files = process_separate_mode(
                clips,
                output_path,
                args.whisper_model or None,
                args.whisper_language or None,
                args.whisper_task or None,
                subtitle_bilingual,
                args.llm_cmd,
                args.llm_model or None,
                args.llm_args or None,
                args.crf,
                args.preset,
                tmpdir,
            )
            for f in output_files:
                print(f)
                print(f"MEDIA:{f}")
            return 0

        # Concat mode: merge all clips into one video
        eprint("Concatenating clips...")
        concat_path = os.path.join(tmpdir, "highlights.mp4")
        concat_clips(clips, concat_path, tmpdir)

        subtitles_arg = args.subtitles.strip().lower()
        if subtitles_arg == "auto":
            final_srt_name = f"{os.path.splitext(os.path.basename(concat_path))[0]}.srt"
            final_srt = os.path.join(tmpdir, final_srt_name)
            if args.resume and os.path.isfile(final_srt):
                eprint(f"Reusing final transcript: {final_srt}")
            else:
                eprint("Transcribing concatenated video...")
                final_srt = run_whisper(
                    concat_path,
                    tmpdir,
                    args.whisper_model or None,
                    args.whisper_language or None,
                    args.whisper_task or None,
                )
        else:
            final_srt = os.path.abspath(args.subtitles)
            if not os.path.isfile(final_srt):
                eprint(f"Subtitle file not found: {final_srt}")
                return 1

        subtitle_bilingual = "" if args.no_bilingual else args.subtitle_bilingual
        if subtitle_bilingual:
            eprint("Generating bilingual subtitles...")
            final_segments = reindex_segments(parse_srt(final_srt))
            if not final_segments:
                eprint("No segments parsed from final subtitles.")
                return 1
            translations = translate_segments(
                final_segments,
                subtitle_bilingual,
                args.llm_cmd,
                args.llm_model or None,
                args.llm_args or None,
                tmpdir,
            )
            bilingual_srt = os.path.join(tmpdir, "bilingual.srt")
            write_srt(final_segments, bilingual_srt, translations)
            final_srt = bilingual_srt

        eprint("Burning subtitles and exporting...")
        burn_subtitles(concat_path, final_srt, output_path, args.crf, args.preset)

        eprint("Done")
        print(output_path)
        print(f"MEDIA:{output_path}")
        return 0
    finally:
        eprint(f"Run dir: {tmpdir}")


if __name__ == "__main__":
    raise SystemExit(main())
