from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

from validator.core.shape_gate import evaluate_shape_gate
from validator.core.shape_metrics import compute_shape_metrics


def load_binary_mask(path: str | Path, threshold: int = 127) -> np.ndarray:
    img = Image.open(path).convert("RGBA")
    alpha = np.array(img.getchannel("A"), dtype=np.uint8)

    if np.any(alpha > 0):
        arr = alpha
    else:
        gray = np.array(img.convert("L"), dtype=np.uint8)
        arr = gray

    return (arr > threshold).astype(np.uint8) * 255


def resize_mask_to_match(mask: np.ndarray, target_shape: tuple[int, int]) -> np.ndarray:
    target_h, target_w = target_shape
    img = Image.fromarray(mask).convert("L")
    resized = img.resize((target_w, target_h), Image.NEAREST)
    return np.array(resized, dtype=np.uint8)


def save_debug_outputs(ref_mask: np.ndarray, gen_mask: np.ndarray, out_dir: str | Path) -> dict:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    ref_path = out_dir / "ref_binary.png"
    gen_path = out_dir / "gen_binary.png"
    diff_path = out_dir / "diff_overlay.png"

    Image.fromarray(ref_mask).save(ref_path)
    Image.fromarray(gen_mask).save(gen_path)

    ref_bin = ref_mask > 0
    gen_bin = gen_mask > 0

    overlay = np.zeros((ref_mask.shape[0], ref_mask.shape[1], 3), dtype=np.uint8)
    overlay[np.logical_and(ref_bin, gen_bin)] = [255, 255, 255]
    overlay[np.logical_and(ref_bin, np.logical_not(gen_bin))] = [255, 0, 0]
    overlay[np.logical_and(gen_bin, np.logical_not(ref_bin))] = [0, 0, 255]

    Image.fromarray(overlay).save(diff_path)

    return {
        "ref_binary_path": str(ref_path),
        "gen_binary_path": str(gen_path),
        "diff_overlay_path": str(diff_path),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Shape validator CLI")
    parser.add_argument("--ref", required=True, help="Reference mask path")
    parser.add_argument("--gen", required=True, help="Generated mask path")
    parser.add_argument("--threshold", type=int, default=127, help="Binary threshold")
    parser.add_argument("--save-debug", action="store_true", help="Save debug mask outputs")
    parser.add_argument("--debug-dir", default="validator/debug", help="Debug output directory")
    parser.add_argument("--out", default=None, help="Optional JSON output path")
    args = parser.parse_args()

    ref_mask = load_binary_mask(args.ref, threshold=args.threshold)
    gen_mask = load_binary_mask(args.gen, threshold=args.threshold)

    if ref_mask.shape != gen_mask.shape:
        gen_mask = resize_mask_to_match(gen_mask, ref_mask.shape)

    metrics = compute_shape_metrics(ref_mask, gen_mask)
    decision = evaluate_shape_gate(metrics)

    result = {
        "status": "success",
        "metrics": metrics,
        "decision": decision,
        "ref_path": str(args.ref),
        "gen_path": str(args.gen),
    }

    if args.save_debug:
        result["debug_outputs"] = save_debug_outputs(ref_mask, gen_mask, args.debug_dir)

    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
