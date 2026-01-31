#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "requests>=2.31.0",
# ]
# ///
"""
Generate or edit images via laozhang.ai (Nano Banana Pro - Google native format).

Usage:
  uv run generate_image.py --prompt "your image description" --filename "output.png"
  uv run generate_image.py --prompt "your image description" --filename "output.png" --aspect-ratio "3:4" --image-size "2K"

Edit/compose (image inputs):
  uv run generate_image.py --prompt "combine these" --filename "output.png" -i img1.png -i img2.png
"""

import argparse
import base64
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple

import requests

DEFAULT_BASE_URL = "https://api.laozhang.ai"
DEFAULT_MODEL = "gemini-3-pro-image-preview"


def eprint(*args: str) -> None:
    print(*args, file=sys.stderr)


def guess_mime(path: Path) -> Optional[str]:
    ext = path.suffix.lower().lstrip(".")
    if ext in {"png"}:
        return "image/png"
    if ext in {"jpg", "jpeg"}:
        return "image/jpeg"
    if ext in {"webp"}:
        return "image/webp"
    if ext in {"gif"}:
        return "image/gif"
    return None


def load_image_base64(path: Path) -> Tuple[str, str]:
    """Load image and return (mime_type, base64_data)."""
    mime = guess_mime(path)
    if not mime:
        raise ValueError(f"Unsupported image type: {path}")
    data = path.read_bytes()
    encoded = base64.b64encode(data).decode("ascii")
    return mime, encoded


def mime_to_ext(mime: str) -> str:
    if mime == "image/png":
        return "png"
    if mime == "image/jpeg":
        return "jpg"
    if mime == "image/webp":
        return "webp"
    if mime == "image/gif":
        return "gif"
    return ""


def build_output_paths(base_path: Path, count: int, mime: str) -> List[Path]:
    ext = base_path.suffix
    if not ext:
        ext = mime_to_ext(mime)
        if ext:
            ext = f".{ext}"
    if count <= 1:
        return [base_path.with_suffix(ext) if ext else base_path]
    stem = base_path.stem if base_path.stem else "image"
    parent = base_path.parent if base_path.parent else Path(".")
    output = []
    for idx in range(1, count + 1):
        output.append(parent / f"{stem}-{idx}{ext}")
    return output


def get_api_key(provided: Optional[str]) -> Optional[str]:
    return provided or os.environ.get("LAOZHANG_API_KEY") or os.environ.get("OPENROUTER_API_KEY")


def get_header(value: Optional[str], env_key: str) -> Optional[str]:
    return value or os.environ.get(env_key)


def build_payload(
    prompt: str,
    input_images: List[Path],
    aspect_ratio: Optional[str],
    image_size: Optional[str],
) -> dict:
    """Build Google native format payload."""
    parts = [{"text": prompt}]

    # Add input images if any
    for img_path in input_images:
        mime, b64_data = load_image_base64(img_path)
        parts.append({
            "inline_data": {
                "mime_type": mime,
                "data": b64_data
            }
        })

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "responseModalities": ["IMAGE"]
        }
    }

    # Add image config if specified
    image_config = {}
    if aspect_ratio:
        image_config["aspectRatio"] = aspect_ratio
    if image_size:
        image_config["imageSize"] = image_size

    if image_config:
        payload["generationConfig"]["imageConfig"] = image_config

    return payload


def parse_response(data: dict) -> List[Tuple[str, bytes]]:
    """Parse Google native format response and return list of (mime, bytes)."""
    saved_paths = []

    candidates = data.get("candidates", [])
    if not candidates:
        return saved_paths

    content = candidates[0].get("content", {})
    parts = content.get("parts", [])

    for part in parts:
        inline_data = part.get("inlineData")
        if not inline_data:
            continue

        mime = inline_data.get("mimeType", "image/png")
        b64_data = inline_data.get("data", "")

        if b64_data:
            payload_bytes = base64.b64decode(b64_data)
            saved_paths.append((mime, payload_bytes))

    return saved_paths


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate or edit images via laozhang.ai (Nano Banana Pro - Google native format)."
    )
    parser.add_argument("--prompt", "-p", required=True, help="Image prompt")
    parser.add_argument("--filename", "-f", required=True, help="Output filename")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Model id (default: {DEFAULT_MODEL})")
    parser.add_argument("--input-image", "-i", action="append", dest="input_images", help="Input image path(s)")
    parser.add_argument(
        "--api-key",
        "-k",
        help="API key (overrides LAOZHANG_API_KEY / OPENROUTER_API_KEY)",
    )
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Base URL")
    parser.add_argument("--app-url", help="Optional HTTP-Referer header")
    parser.add_argument("--app-title", help="Optional X-Title header")
    parser.add_argument("--aspect-ratio", help="Aspect ratio (e.g. 1:1, 16:9, 3:4, 9:16)")
    parser.add_argument("--image-size", help="Image size (e.g. 1K, 2K, 4K)")

    args = parser.parse_args()

    api_key = get_api_key(args.api_key)
    if not api_key:
        eprint("Error: No API key provided.")
        eprint("Provide --api-key or set LAOZHANG_API_KEY / OPENROUTER_API_KEY.")
        return 1

    # Load input images
    input_image_paths = []
    if args.input_images:
        for path_str in args.input_images:
            path = Path(path_str)
            if not path.exists():
                eprint(f"Input image not found: {path}")
                return 1
            input_image_paths.append(path)

    # Build payload
    payload = build_payload(
        args.prompt,
        input_image_paths,
        args.aspect_ratio,
        args.image_size,
    )

    # Log payload (without base64 image data)
    log_payload = json.loads(json.dumps(payload))
    for content in log_payload.get("contents", []):
        for part in content.get("parts", []):
            if "inline_data" in part:
                part["inline_data"]["data"] = f"<base64 data: {len(part['inline_data']['data'])} chars>"
    eprint("=" * 60)
    eprint("Request payload:")
    eprint(json.dumps(log_payload, indent=2, ensure_ascii=False))
    eprint("=" * 60)

    # Build headers
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    app_url = get_header(args.app_url, "LAOZHANG_APP_URL") or get_header(args.app_url, "OPENROUTER_APP_URL")
    app_title = get_header(args.app_title, "LAOZHANG_APP_TITLE") or get_header(args.app_title, "OPENROUTER_APP_TITLE")
    if app_url:
        headers["HTTP-Referer"] = app_url
    if app_title:
        headers["X-Title"] = app_title

    # Send request
    url = args.base_url.rstrip("/") + f"/v1beta/models/{args.model}:generateContent"
    eprint(f"Request URL: {url}")
    eprint("Sending request...")

    response = requests.post(url, headers=headers, data=json.dumps(payload), timeout=300)

    eprint(f"Response status: {response.status_code}")

    if response.status_code >= 400:
        eprint(f"API error ({response.status_code}): {response.text}")
        return 1

    # Parse response
    data = response.json()
    saved_paths = parse_response(data)

    if not saved_paths:
        eprint("No images returned from API.")
        return 1

    # Save images with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_base = Path(args.filename)

    # Add timestamp to filename
    stem = output_base.stem
    suffix = output_base.suffix
    timestamped_name = f"{stem}_{timestamp}{suffix}"

    # Use ~/Downloads/ as output directory
    downloads_dir = Path.home() / "Downloads"
    downloads_dir.mkdir(parents=True, exist_ok=True)
    output_base = downloads_dir / timestamped_name

    output_paths = build_output_paths(output_base, len(saved_paths), saved_paths[0][0])

    for (mime, payload_bytes), out_path in zip(saved_paths, output_paths):
        if not out_path.suffix:
            ext = mime_to_ext(mime)
            if ext:
                out_path = out_path.with_suffix(f".{ext}")
        out_path.write_bytes(payload_bytes)
        full_path = out_path.resolve()
        print(f"Image saved: {full_path}")
        print(f"MEDIA: {full_path}")
        # Output the actual file path for subsequent steps to use
        print(f"OUTPUT_FILE: {full_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
