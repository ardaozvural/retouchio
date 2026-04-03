from __future__ import annotations

import numpy as np

from validator.core.shape_metrics import compute_shape_metrics
from validator.core.shape_gate import evaluate_shape_gate
from validator.core.polygon_generator import generate_base_polygon_mask


def shift_mask(mask: np.ndarray, dx: int = 0, dy: int = 0) -> np.ndarray:
    h, w = mask.shape
    shifted = np.zeros_like(mask)

    ys, xs = np.nonzero(mask > 0)
    ys_new = ys + dy
    xs_new = xs + dx

    valid = (ys_new >= 0) & (ys_new < h) & (xs_new >= 0) & (xs_new < w)
    shifted[ys_new[valid], xs_new[valid]] = 255

    return shifted


def cut_mask(mask: np.ndarray, cut_ratio: float = 0.2) -> np.ndarray:
    h, w = mask.shape
    cut_h = int(h * cut_ratio)
    new_mask = mask.copy()
    new_mask[h - cut_h :, :] = 0
    return new_mask


def print_case(name: str, ref: np.ndarray, gen: np.ndarray) -> None:
    print(f"=== {name} ===")

    metrics = compute_shape_metrics(ref, gen)
    decision = evaluate_shape_gate(metrics)

    print("metrics:", metrics)
    print("decision:", decision)
    print()


def main() -> None:
    ref = generate_base_polygon_mask()

    perfect = ref.copy()
    shifted = shift_mask(ref, dx=6, dy=0)
    cut = cut_mask(ref, cut_ratio=0.2)

    print_case("PERFECT", ref, perfect)
    print_case("SHIFTED", ref, shifted)
    print_case("CUT", ref, cut)


if __name__ == "__main__":
    main()
