from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict

from validator.cli.validator_cli import (
    load_binary_mask,
    resize_mask_to_match,
    save_debug_outputs,
)
from validator.core.shape_gate import evaluate_shape_gate
from validator.core.shape_metrics import compute_shape_metrics


def run_job_validation(
    ref_path: str | Path,
    gen_path: str | Path,
    out_path: str | Path,
    threshold: int = 127,
    save_debug: bool = True,
    debug_dir: str | Path = "validator/debug",
) -> Dict[str, Any]:
    ref_path = Path(ref_path)
    gen_path = Path(gen_path)
    out_path = Path(out_path)

    ref_mask = load_binary_mask(ref_path, threshold=threshold)
    gen_mask = load_binary_mask(gen_path, threshold=threshold)

    if ref_mask.shape != gen_mask.shape:
        gen_mask = resize_mask_to_match(gen_mask, ref_mask.shape)

    metrics = compute_shape_metrics(ref_mask, gen_mask)
    decision = evaluate_shape_gate(metrics)

    result: Dict[str, Any] = {
        "status": "success",
        "metrics": metrics,
        "decision": decision,
        "ref_path": str(ref_path),
        "gen_path": str(gen_path),
    }

    if save_debug:
        result["debug_outputs"] = save_debug_outputs(ref_mask, gen_mask, debug_dir)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, indent=2), encoding="utf-8")

    return result


def run_job_validation_from_config(job_config_path: str | Path) -> Dict[str, Any]:
    job_config_path = Path(job_config_path)
    job = json.loads(job_config_path.read_text(encoding="utf-8"))

    validator_cfg = job["validator"]

    result = run_job_validation(
        ref_path=validator_cfg["refMaskPath"],
        gen_path=validator_cfg["genMaskPath"],
        out_path=validator_cfg["outputJsonPath"],
        threshold=validator_cfg.get("threshold", 127),
        save_debug=validator_cfg.get("saveDebug", True),
        debug_dir=validator_cfg.get("debugDir", "validator/debug"),
    )

    return {
        "jobId": job.get("jobId"),
        "displayName": job.get("displayName"),
        "validation": result,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Job-level shape validator runner")
    parser.add_argument("--job-config", required=True, help="Path to job JSON config")
    args = parser.parse_args()

    result = run_job_validation_from_config(args.job_config)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
