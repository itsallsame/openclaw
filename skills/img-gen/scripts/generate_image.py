#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "requests>=2.31.0",
# ]
# ///
"""
Generate images via Doubao (豆包) Seedream API.

Usage:
  uv run generate_image.py --prompt "your image description" --filename "output.png"
  uv run generate_image.py --prompt "your image description" --filename "output.png" --size "2K"
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

DEFAULT_BASE_URL = "https://ark.cn-beijing.volces.com"
DEFAULT_MODEL = "doubao-seedream-4-0-250828"


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
    return provided or os.environ.get("ARK_API_KEY") or os.environ.get("DOUBAO_API_KEY")


def get_header(value: Optional[str], env_key: str) -> Optional[str]:
    return value or os.environ.get(env_key)


def build_payload(
    prompt: str,
    input_images: List[Path],
    size: Optional[str],
    watermark: bool,
) -> dict:
    """Build Doubao API payload."""
    payload = {
        "model": DEFAULT_MODEL,
        "prompt": prompt,
        "sequential_image_generation": "disabled",
        "response_format": "url",
        "stream": False,
        "watermark": watermark,
    }

    if size:
        payload["size"] = size

    # Note: Doubao API doesn't support input images for editing
    # If input_images provided, we ignore them
    if input_images:
        eprint("Warning: Doubao API doesn't support input images, ignoring them")

    return payload


def parse_response(data: dict) -> List[str]:
    """Parse Doubao API response and return list of image URLs."""
    image_urls = []

    # Doubao API returns: {"data": [{"url": "..."}, ...]}
    data_list = data.get("data", [])
    for item in data_list:
        url = item.get("url")
        if url:
            image_urls.append(url)

    return image_urls


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate images via Doubao (豆包) Seedream API."
    )
    parser.add_argument("--prompt", "-p", required=True, help="Image prompt")
    parser.add_argument("--filename", "-f", required=True, help="Output filename")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Model id (default: {DEFAULT_MODEL})")
    parser.add_argument("--input-image", "-i", action="append", dest="input_images", help="Input image path(s) (not supported by Doubao)")
    parser.add_argument(
        "--api-key",
        "-k",
        help="API key (overrides ARK_API_KEY / DOUBAO_API_KEY)",
    )
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Base URL")
    parser.add_argument("--size", default="2K", help="Image size (1K, 2K, 4K, default: 2K)")
    parser.add_argument("--watermark", action="store_true", default=False, help="Add watermark")
    parser.add_argument("--no-watermark", action="store_false", dest="watermark", help="Disable watermark (default)")

    args = parser.parse_args()

    api_key = get_api_key(args.api_key)
    if not api_key:
        eprint("Error: No API key provided.")
        eprint("Provide --api-key or set ARK_API_KEY / DOUBAO_API_KEY.")
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
        args.size,
        args.watermark,
    )

    # Log payload
    eprint("=" * 60)
    eprint("Request payload:")
    eprint(json.dumps(payload, indent=2, ensure_ascii=False))
    eprint("=" * 60)

    # Build headers
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    # Send request
    url = args.base_url.rstrip("/") + "/api/v3/images/generations"
    eprint(f"Request URL: {url}")
    eprint("Sending request...")

    response = requests.post(url, headers=headers, data=json.dumps(payload), timeout=300)

    eprint(f"Response status: {response.status_code}")

    if response.status_code >= 400:
        eprint(f"API error ({response.status_code}): {response.text}")
        return 1

    # Parse response
    data = response.json()
    image_urls = parse_response(data)

    if not image_urls:
        eprint("No images returned from API.")
        return 1

    # Download and save images with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_base = Path(args.filename)

    # Add timestamp to filename
    stem = output_base.stem
    suffix = output_base.suffix or ".png"
    timestamped_name = f"{stem}_{timestamp}{suffix}"

    # Use ~/Downloads/ as output directory
    downloads_dir = Path.home() / "Downloads"
    downloads_dir.mkdir(parents=True, exist_ok=True)

    for idx, url in enumerate(image_urls):
        # Download image from URL
        eprint(f"Downloading image {idx + 1}/{len(image_urls)} from {url}")
        img_response = requests.get(url, timeout=60)

        if img_response.status_code != 200:
            eprint(f"Failed to download image: {img_response.status_code}")
            continue

        # Determine output path
        if len(image_urls) > 1:
            out_name = f"{stem}_{timestamp}_{idx + 1}{suffix}"
        else:
            out_name = timestamped_name

        out_path = downloads_dir / out_name
        out_path.write_bytes(img_response.content)

        full_path = out_path.resolve()
        print(f"Image saved: {full_path}")
        print(f"MEDIA: {full_path}")
        print(f"OUTPUT_FILE: {full_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
