from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict

from prompt_contracts.resolver.prompt_block_builder import build_prompt_blocks


def _read_json(path: str | Path) -> Dict[str, Any]:
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"JSON file not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def assemble_prompt_from_job(job_config_path: str | Path) -> Dict[str, Any]:
    job = _read_json(job_config_path)

    entities = job.get("entities", {})
    assembled_entities: Dict[str, Any] = {}

    for entity_name, entity_cfg in entities.items():
        mode = entity_cfg.get("mode")
        if not mode:
            raise ValueError(f"Missing mode for entity '{entity_name}'")

        assembled_entities[entity_name] = {
            "config": entity_cfg,
            "compiled": build_prompt_blocks(entity_name, mode),
        }

    return {
        "jobId": job.get("jobId"),
        "displayName": job.get("displayName"),
        "subjectReference": job.get("subjectReference"),
        "outputProfile": job.get("outputProfile"),
        "entities": assembled_entities,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Assemble multi-entity prompt blocks from job config")
    parser.add_argument("--job-config", required=True, help="Path to job JSON config")
    args = parser.parse_args()

    result = assemble_prompt_from_job(args.job_config)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
