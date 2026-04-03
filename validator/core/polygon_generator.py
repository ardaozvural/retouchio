from __future__ import annotations

import numpy as np


def generate_base_polygon_mask(height: int = 128, width: int = 128) -> np.ndarray:
    """
    Returns a deterministic, asymmetrical, sneaker-like binary mask.
    Shape is intentionally asymmetrical to stabilize PCA-based orientation.
    """
    mask = np.zeros((height, width), dtype=np.uint8)

    # Asymmetrical sneaker-like body
    # left heel narrower, toe section longer and slightly rising
    points = np.array(
        [
            [22, 88],   # heel top
            [18, 104],  # heel bottom-left
            [30, 110],  # sole rear
            [58, 112],  # sole mid
            [86, 108],  # forefoot lower
            [104, 98],  # toe lower
            [110, 88],  # toe tip
            [100, 78],  # toe upper
            [82, 70],   # vamp
            [62, 66],   # mid upper
            [44, 68],   # collar front
            [30, 74],   # collar rear
        ],
        dtype=np.int32,
    )

    _fill_polygon(mask, points, value=255)
    return mask


def _fill_polygon(mask: np.ndarray, points: np.ndarray, value: int = 255) -> None:
    """
    Simple scanline polygon fill without external deps.
    points: Nx2 in (x, y)
    """
    h, w = mask.shape
    ys = points[:, 1]
    min_y = max(int(ys.min()), 0)
    max_y = min(int(ys.max()), h - 1)

    n = len(points)

    for y in range(min_y, max_y + 1):
        intersections = []

        for i in range(n):
            x1, y1 = points[i]
            x2, y2 = points[(i + 1) % n]

            if y1 == y2:
                continue

            if y >= min(y1, y2) and y < max(y1, y2):
                x = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
                intersections.append(x)

        intersections.sort()

        for i in range(0, len(intersections), 2):
            if i + 1 >= len(intersections):
                break
            x_start = max(int(np.ceil(intersections[i])), 0)
            x_end = min(int(np.floor(intersections[i + 1])), w - 1)
            if x_start <= x_end:
                mask[y, x_start:x_end + 1] = value
