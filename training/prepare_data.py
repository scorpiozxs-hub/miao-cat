"""Render Quick, Draw! simplified NDJSON into a balanced 28x28 dataset."""
from __future__ import annotations

import argparse
import hashlib
import json
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from paths import data_root

CLASSES = [
    ("cat", "cat"), ("dog", "dog"), ("rabbit", "rabbit"), ("fish", "fish"),
    ("bear", "bear"), ("mouse", "mouse"), ("face", "person"), ("house", "house"),
]
SIZE = 28


def render(drawing: list) -> np.ndarray | None:
    points = [(float(x), float(y)) for stroke in drawing if len(stroke) >= 2
              for x, y in zip(stroke[0], stroke[1])]
    if not points:
        return None
    xs, ys = zip(*points)
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    span = max(x1 - x0, y1 - y0, 1.0)
    canvas_size, margin = 112, 8
    scale = (canvas_size - 2 * margin) / span
    offset_x = (canvas_size - (x1 - x0) * scale) / 2
    offset_y = (canvas_size - (y1 - y0) * scale) / 2
    image = Image.new("L", (canvas_size, canvas_size), 0)
    painter = ImageDraw.Draw(image)
    for stroke in drawing:
        if len(stroke) < 2 or not stroke[0]:
            continue
        line = [(round(offset_x + (x - x0) * scale), round(offset_y + (y - y0) * scale))
                for x, y in zip(stroke[0], stroke[1])]
        if len(line) == 1:
            x, y = line[0]
            painter.ellipse((x - 4, y - 4, x + 4, y + 4), fill=255)
        else:
            painter.line(line, fill=255, width=8, joint="curve")
            radius = 4
            for x, y in (line[0], line[-1]):
                painter.ellipse((x - radius, y - radius, x + radius, y + radius), fill=255)
    return np.asarray(image.resize((SIZE, SIZE), Image.Resampling.LANCZOS), dtype=np.uint8)


def split_for(key_id: str) -> str:
    bucket = int(hashlib.sha1(key_id.encode("utf-8")).hexdigest()[:8], 16) % 100
    return "train" if bucket < 80 else "validation" if bucket < 90 else "test"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=data_root())
    parser.add_argument("--output-dir", type=Path, default=Path("training") / "artifacts" / "quickdraw-28")
    parser.add_argument("--limit-per-class", type=int, default=20000,
                        help="Balanced cap per class; set 0 to keep all recognized drawings.")
    parser.add_argument("--seed", type=int, default=20261028)
    args = parser.parse_args()
    if not args.data_dir.is_dir():
        raise SystemExit(f"Data directory not found: {args.data_dir}")

    rng = random.Random(args.seed)
    split_images: dict[str, list[np.ndarray]] = {name: [] for name in ("train", "validation", "test")}
    split_labels: dict[str, list[np.ndarray]] = {name: [] for name in split_images}
    class_counts: dict[str, dict[str, int]] = {}

    for label, (source, folder) in enumerate(CLASSES):
        source_file = args.data_dir / folder / f"{source}.ndjson"
        if not source_file.is_file():
            raise SystemExit(f"Missing category file: {source_file}")
        reservoir: list[str] = []
        seen = 0
        with source_file.open("r", encoding="utf-8") as stream:
            for line in stream:
                try:
                    record = json.loads(line)
                    if not record.get("recognized", False):
                        continue
                    drawing = record.get("drawing")
                    if not drawing:
                        continue
                except (json.JSONDecodeError, TypeError):
                    continue
                seen += 1
                if args.limit_per_class <= 0 or len(reservoir) < args.limit_per_class:
                    reservoir.append(line)
                else:
                    index = rng.randrange(seen)
                    if index < args.limit_per_class:
                        reservoir[index] = line
        buckets: dict[str, list[np.ndarray]] = {name: [] for name in split_images}
        for line in reservoir:
            record = json.loads(line)
            image = render(record["drawing"])
            if image is not None:
                buckets[split_for(str(record["key_id"]))].append(image)
        counts: dict[str, int] = {}
        for split, images in buckets.items():
            if images:
                array = np.stack(images)
                split_images[split].append(array)
                split_labels[split].append(np.full(len(images), label, dtype=np.int64))
            counts[split] = len(images)
        class_counts[source] = {"selected": sum(counts.values()), "recognized_available": seen, **counts}
        print(f"{source}: {counts} (recognized available: {seen})", flush=True)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    for split in split_images:
        if not split_images[split]:
            raise SystemExit(f"No images in split {split}")
        images = np.concatenate(split_images[split]).astype(np.uint8, copy=False)
        labels = np.concatenate(split_labels[split])
        order = np.random.default_rng(args.seed).permutation(len(labels))
        np.savez_compressed(args.output_dir / f"{split}.npz", images=images[order], labels=labels[order])
        print(f"Saved {split}: {len(labels)} samples", flush=True)
    metadata = {
        "classes": [source for source, _ in CLASSES],
        "displayNames": ["猫", "狗", "兔", "鱼", "熊", "老鼠", "人物头像（face）", "房屋"],
        "imageShape": [1, SIZE, SIZE], "pixelRange": [0, 255],
        "split": "SHA-1(key_id): 80/10/10; key_id identifies a drawing, not its author",
        "recognizedOnly": True, "seed": args.seed, "limitPerClass": args.limit_per_class,
        "counts": class_counts,
        "sourceLicense": "CC BY 4.0; attribution: Google Quick, Draw! Dataset",
    }
    (args.output_dir / "metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Prepared dataset at {args.output_dir.resolve()}")


if __name__ == "__main__":
    main()
