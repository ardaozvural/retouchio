from __future__ import annotations

from typing import Any, Dict, List


DEFAULT_SHAPE_THRESHOLDS = {
    "min_iou_score": 0.90,
    "max_bottom_anchor_delta_px": 4.0,
    "max_tilt_degrees": 3.0,
    "max_boundary_p90_px": 4.0,
}


def evaluate_shape_gate(
    metrics: Dict[str, Any],
    thresholds: Dict[str, float] | None = None,
) -> Dict[str, Any]:
    """
    Pure decision layer.
    Does not compute metrics.
    Applies no-compensation rule:
    any failed metric => gate fail
    """
    t = {**DEFAULT_SHAPE_THRESHOLDS, **(thresholds or {})}
    failed_checks: List[str] = []

    iou_score = metrics.get("iou_score")
    bottom_anchor_delta_px = metrics.get("bottom_anchor_delta_px")
    tilt_degrees = metrics.get("tilt_degrees")
    boundary_p90_px = metrics.get("boundary_p90_px")

    if iou_score is None or iou_score < t["min_iou_score"]:
        failed_checks.append("iou_score")

    if (
        bottom_anchor_delta_px is None
        or bottom_anchor_delta_px > t["max_bottom_anchor_delta_px"]
    ):
        failed_checks.append("bottom_anchor_delta_px")

    if tilt_degrees is None or tilt_degrees > t["max_tilt_degrees"]:
        failed_checks.append("tilt_degrees")

    if boundary_p90_px is None or boundary_p90_px > t["max_boundary_p90_px"]:
        failed_checks.append("boundary_p90_px")

    passed = len(failed_checks) == 0

    return {
        "passed": passed,
        "failed_checks": failed_checks,
        "thresholds": t,
    }
