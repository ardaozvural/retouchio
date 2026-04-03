from __future__ import annotations

import json
from typing import Dict, Any, List

from prompt_contracts.resolver.prompt_assembler import assemble_prompt_from_job


def _format_section(title: str, lines: List[str]) -> str:
    if not lines:
        return ""
    return f"{title}:\n" + "\n".join(f"- {line}" for line in lines) + "\n"


def _collect_rule_texts(compiled: Dict[str, Any]) -> List[str]:
    texts: List[str] = []
    for group, group_lines in compiled.get("rule_group_texts", {}).items():
        texts.extend(group_lines)
    return texts


def _collect_block_lines(compiled: Dict[str, Any]) -> Dict[str, List[str]]:
    blocks = compiled.get("blocks", {})
    return {
        "invariants": blocks.get("invariants", []),
        "allowed": blocks.get("allowed_transforms", []),
        "forbidden": blocks.get("forbidden", []),
        "placement": blocks.get("placement_rules", []),
        "coverage": blocks.get("coverage_rules", [])
    }


def build_final_prompt(job_config_path: str) -> str:
    assembled = assemble_prompt_from_job(job_config_path)

    lines: List[str] = []

    # HEADER
    lines.append("STRICT CONTROLLED GENERATION — MULTI-ENTITY CONTRACT SYSTEM\n")

    for entity_name, entity_data in assembled["entities"].items():
        compiled = entity_data["compiled"]

        lines.append(f"## {entity_name.upper()} ({compiled['mode']})\n")

        # Rule group texts (en güçlü kısım)
        rule_lines = _collect_rule_texts(compiled)
        if rule_lines:
            lines.append(_format_section("PRIMARY RULES", rule_lines))

        # Contract fallback (support rules)
        block_lines = _collect_block_lines(compiled)

        if block_lines["invariants"]:
            lines.append(_format_section("INVARIANTS", block_lines["invariants"]))

        if block_lines["allowed"]:
            lines.append(_format_section("ALLOWED", block_lines["allowed"]))

        if block_lines["forbidden"]:
            lines.append(_format_section("FORBIDDEN", block_lines["forbidden"]))

        if block_lines["placement"]:
            lines.append(_format_section("PLACEMENT", block_lines["placement"]))

        if block_lines["coverage"]:
            lines.append(_format_section("COVERAGE", block_lines["coverage"]))

        lines.append("\n")

    return "\n".join(lines)


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Build final prompt string from job config")
    parser.add_argument("--job-config", required=True)
    args = parser.parse_args()

    prompt = build_final_prompt(args.job_config)
    print(prompt)


if __name__ == "__main__":
    main()
