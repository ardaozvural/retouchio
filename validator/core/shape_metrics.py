from __future__ import annotations

import math
from typing import Any, Dict

import numpy as np


def _ensure_binary_mask(mask: np.ndarray) -> np.ndarray:
    """
    Accepts a 2D array and returns a boolean binary mask.
    Non-zero values are treated as foreground.
    """
    if not isinstance(mask, np.ndarray):
        raise TypeError("mask must be a numpy.ndarray")

    if mask.ndim != 2:
        raise ValueError(f"mask must be 2D, got shape={mask.shape}")

    return mask > 0


def _foreground_coords(mask: np.ndarray) -> np.ndarray:
    """
    Returns Nx2 coordinates in (y, x) order for foreground pixels.
    """
    ys, xs = np.nonzero(mask)
    if ys.size == 0:
        return np.empty((0, 2), dtype=np.int32)
    return np.column_stack((ys, xs))


def _bottom_anchor_x(mask: np.ndarray) -> float | None:
    """
    Finds the horizontal center of the lowest foreground row.
    Returns x-center in pixel coordinates.
    """
    coords = _foreground_coords(mask)
    if coords.shape[0] == 0:
        return None

    max_y = coords[:, 0].max()
    row_xs = coords[coords[:, 0] == max_y][:, 1]
    return float((row_xs.min() + row_xs.max()) / 2.0)


def _principal_axis_angle_deg(mask: np.ndarray) -> float | None:
    """
    Estimates major-axis orientation using PCA on foreground pixels.
    Returns angle in degrees relative to +x axis.
    """
    coords = _foreground_coords(mask)
    if coords.shape[0] < 2:
        return None

    xy = np.column_stack((coords[:, 1].astype(np.float64), coords[:, 0].astype(np.float64)))
    centered = xy - xy.mean(axis=0, keepdims=True)

    cov = np.cov(centered, rowvar=False)
    eigvals, eigvecs = np.linalg.eigh(cov)
    principal_vec = eigvecs[:, np.argmax(eigvals)]

    angle_rad = math.atan2(principal_vec[1], principal_vec[0])
    angle_deg = math.degrees(angle_rad)

    return float(angle_deg)


def _normalized_tilt_deg(angle_deg: float | None) -> float | None:
    """
    Converts raw PCA angle into a minimal absolute tilt.
    Because a principal axis is direction-agnostic, reduce to [0, 90].
    """
    if angle_deg is None:
        return None

    a = abs(angle_deg) % 180.0
    if a > 90.0:
        a = 180.0 - a
    return float(a)


def _boundary_points(mask: np.ndarray) -> np.ndarray:
    """
    Simple 4-neighborhood boundary extraction.
    Returns Nx2 coordinates in (y, x).
    """
    coords = _foreground_coords(mask)
    if coords.shape[0] == 0:
        return np.empty((0, 2), dtype=np.int32)

    h, w = mask.shape
    boundary = []

    for y, x in coords:
        neighbors = (
            (y - 1, x),
            (y + 1, x),
            (y, x - 1),
            (y, x + 1),
        )

        for ny, nx in neighbors:
            if ny < 0 or ny >= h or nx < 0 or nx >= w or not mask[ny, nx]:
                boundary.append((y, x))
                break

    if not boundary:
        return np.empty((0, 2), dtype=np.int32)

    return np.array(boundary, dtype=np.int32)


def _pairwise_min_distances(points_a: np.ndarray, points_b: np.ndarray) -> np.ndarray:
    """
    For each point in A, compute the minimum Euclidean distance to any point in B.
    """
    if points_a.shape[0] == 0 or points_b.shape[0] == 0:
        return np.array([], dtype=np.float64)

    a = points_a.astype(np.float64)
    b = points_b.astype(np.float64)

    diff = a[:, None, :] - b[None, :, :]
    dists = np.sqrt(np.sum(diff ** 2, axis=2))
    return dists.min(axis=1)


def compute_shape_metrics(ref_mask: np.ndarray, gen_mask: np.ndarray) -> Dict[str, Any]:
    """
    Pure metric computation only.
    No thresholding, no pass/fail logic, no gate decision.

    Returns:
    {
      "iou_score": float,
      "bottom_anchor_delta_px": float | None,
      "tilt_degrees": float | None,
      "boundary_p90_px": float | None,
      "ref_foreground_px": int,
      "gen_foreground_px": int
    }
    """
    ref = _ensure_binary_mask(ref_mask)
    gen = _ensure_binary_mask(gen_mask)

    ref_fg = int(ref.sum())
    gen_fg = int(gen.sum())

    if ref.shape != gen.shape:
        raise ValueError(f"mask shapes must match, got ref={ref.shape}, gen={gen.shape}")

    intersection = int(np.logical_and(ref, gen).sum())
    union = int(np.logical_or(ref, gen).sum())
    iou_score = float(intersection / union) if union > 0 else 0.0

    ref_anchor_x = _bottom_anchor_x(ref)
    gen_anchor_x = _bottom_anchor_x(gen)
    if ref_anchor_x is None or gen_anchor_x is None:
        bottom_anchor_delta_px = None
    else:
        bottom_anchor_delta_px = float(abs(ref_anchor_x - gen_anchor_x))

    ref_tilt = _normalized_tilt_deg(_principal_axis_angle_deg(ref))
    gen_tilt = _normalized_tilt_deg(_principal_axis_angle_deg(gen))
    if ref_tilt is None or gen_tilt is None:
        tilt_degrees = None
    else:
        tilt_degrees = float(abs(ref_tilt - gen_tilt))

    ref_boundary = _boundary_points(ref)
    gen_boundary = _boundary_points(gen)
    if ref_boundary.shape[0] == 0 or gen_boundary.shape[0] == 0:
        boundary_p90_px = None
    else:
        d_ref_to_gen = _pairwise_min_distances(ref_boundary, gen_boundary)
        d_gen_to_ref = _pairwise_min_distances(gen_boundary, ref_boundary)
        all_dists = np.concatenate([d_ref_to_gen, d_gen_to_ref])
        boundary_p90_px = float(np.percentile(all_dists, 90)) if all_dists.size > 0 else None

    return {
        "iou_score": iou_score,
        "bottom_anchor_delta_px": bottom_anchor_delta_px,
        "tilt_degrees": tilt_degrees,
        "boundary_p90_px": boundary_p90_px,
        "ref_foreground_px": ref_fg,
        "gen_foreground_px": gen_fg,
    }
