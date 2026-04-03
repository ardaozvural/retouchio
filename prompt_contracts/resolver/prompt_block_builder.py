from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from prompt_contracts.resolver.contract_resolver import resolve_entity_contract


BASE_DIR = Path(__file__).resolve().parent.parent
RULE_GROUPS_DIR = BASE_DIR / "rule_groups"


RULE_GROUP_TO_FIELDS = {
    "silhouette_lock": ["invariants"],
    "pattern_lock": ["invariants", "failure_conditions"],
    "fabric_lock": ["invariants", "forbidden"],
    "fabric_lock_strict": ["invariants", "forbidden"],
    "neckline_lock": ["invariants", "occlusion_rules", "coverage_rules"],
    "proportion_lock": ["invariants"],
    "occlusion_protection": ["occlusion_rules", "coverage_rules", "forbidden"],

    "identity_lock": ["invariants", "forbidden", "failure_conditions"],
    "shape_lock": ["invariants", "failure_conditions"],
    "strap_topology_lock": ["invariants", "forbidden", "failure_conditions"],
    "material_lock": ["invariants", "forbidden"],
    "color_lock": ["invariants", "forbidden"],
    "branding_lock": ["invariants", "forbidden", "failure_conditions"],
    "pair_consistency": ["placement_rules"],
    "ground_contact_rules": ["placement_rules"],
    "ankle_integration_rules": ["placement_rules", "allowed_transforms"],
    "replacement_rules": ["forbidden", "placement_rules"],
    "new_reference_adaptation_rules": ["allowed_transforms", "reference_policy"],
    "old_footwear_removal_rules": ["forbidden"],

    "reference_adaptation": ["allowed_transforms", "reference_policy"],
    "placement_rules": ["placement_rules"],
    "coverage_rules": ["coverage_rules"],
    "hair_integration_rules": ["allowed_transforms", "placement_rules"],
    "garment_occlusion_protection": ["coverage_rules", "forbidden"],
    "existing_headwear_preservation": ["invariants", "forbidden"],
    "old_headwear_removal_rules": ["forbidden"],

    "controlled_styling_rules": ["allowed_transforms"],
}


def _read_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"JSON file not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def _dedupe_keep_order(items: List[str]) -> List[str]:
    seen = set()
    out: List[str] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            out.append(item)
    return out


def _load_rule_group_texts(entity: str) -> Dict[str, List[str]]:
    path = RULE_GROUPS_DIR / f"{entity}.rule_groups.json"
    if not path.exists():
        return {}
    data = _read_json(path)
    return data.get("rule_groups", {})


def build_prompt_blocks(entity: str, mode: str) -> Dict[str, Any]:
    resolved = resolve_entity_contract(entity, mode)
    contract = resolved["contract"]
    active_rule_groups = resolved["active_rule_groups"]
    rule_group_texts = _load_rule_group_texts(entity)

    selected_fields: List[str] = []
    for group in active_rule_groups:
        selected_fields.extend(RULE_GROUP_TO_FIELDS.get(group, []))

    selected_fields = _dedupe_keep_order(selected_fields)

    blocks: Dict[str, Any] = {
        "entity": entity,
        "mode": mode,
        "priority": resolved["priority"],
        "active_rule_groups": active_rule_groups,
        "reference_policy": resolved["reference_policy"],
        "blocks": {},
        "rule_group_texts": {}
    }

    for field in selected_fields:
        if field in contract:
            blocks["blocks"][field] = contract[field]

    for group in active_rule_groups:
        if group in rule_group_texts:
            blocks["rule_group_texts"][group] = rule_group_texts[group]

    return blocks


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Build prompt blocks from entity contract + mode")
    parser.add_argument("--entity", required=True)
    parser.add_argument("--mode", required=True)
    args = parser.parse_args()

    result = build_prompt_blocks(args.entity, args.mode)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
