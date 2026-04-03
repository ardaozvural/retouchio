from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict


BASE_DIR = Path(__file__).resolve().parent.parent
CONTRACTS_DIR = BASE_DIR / "contracts"
MODES_DIR = BASE_DIR / "modes"


def _read_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"JSON file not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def load_contract(entity: str) -> Dict[str, Any]:
    path = CONTRACTS_DIR / f"{entity}.contract.json"
    return _read_json(path)


def load_modes(entity: str) -> Dict[str, Any]:
    path = MODES_DIR / f"{entity}.modes.json"
    return _read_json(path)


def resolve_entity_contract(entity: str, mode: str) -> Dict[str, Any]:
    contract = load_contract(entity)
    modes = load_modes(entity)

    supported_modes = modes.get("supported_modes", [])
    if mode not in supported_modes:
        raise ValueError(
            f"Unsupported mode '{mode}' for entity '{entity}'. "
            f"Supported: {supported_modes}"
        )

    mode_cfg = modes["modes"][mode]

    return {
        "entity": entity,
        "mode": mode,
        "priority": contract.get("priority"),
        "active_rule_groups": mode_cfg.get("enable_rule_groups", []),
        "disabled_rule_groups": mode_cfg.get("disable_rule_groups", []),
        "reference_policy": mode_cfg.get("reference_policy", contract.get("reference_policy", {})),
        "contract": contract,
        "mode_config": mode_cfg,
    }


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Resolve prompt contract for an entity/mode pair")
    parser.add_argument("--entity", required=True, help="Entity name, e.g. garment, footwear, headwear")
    parser.add_argument("--mode", required=True, help="Mode name, e.g. preserve, replace, add")
    args = parser.parse_args()

    result = resolve_entity_contract(args.entity, args.mode)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
