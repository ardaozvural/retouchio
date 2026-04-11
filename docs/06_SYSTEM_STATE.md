# System State

## Active

| Subsystem | Status | Proof |
| --- | --- | --- |
| Node HTTP server | Active | `job_builder_server.js` |
| Canonical job normalization | Active | `normalizeJob()` |
| Canonical validation | Active | `validateCanonicalJob()` |
| Modular prompt compiler | Active | `buildPrompt()` and `prompt_system/modules/*` |
| Asset bank discovery | Active | `assetBank.js`, `optionRegistry.js` |
| Gemini batch submission | Active | `edit.js` |
| Batch registry and manifests | Active | `batchRegistry.js`, manifest writers in server |
| Asset Manager, Input Manager, Batch Jobs UIs | Active | `ui/*` |

## Partial

| Subsystem | Why partial |
| --- | --- |
| Accessory asset bank | families exist, but eyewear, bag, and neckwear have no discovered assets in this checkout |
| Headwear support | schema supports bandana, hat, headband; asset bank currently resolves only one bandana asset |
| Job Builder state shape | supported compile-active fields are now visible, but some visible shells still write through hidden backing controls |
| Review workflow | approve / reject / retry are now real and persisted, but broader workflow state is still intentionally thin |
| Staged input lifecycle | server-backed runs copy selected input files into per-run staging directories and keep source libraries untouched |

## Legacy Compatibility

| Subsystem | Current role |
| --- | --- |
| Slot-era job fields | normalization and warning-only compatibility |
| `edit.js` no-arg mode | legacy batch submission path |
| `slot_key` | compatibility hook into slot rules |
| `batch_output/` flat read fallback | compatibility for older output layout |
| `prompt_contracts/*` | historical prompt system, not active runtime |

## Missing

| Capability | Current state |
| --- | --- |
| Multi-run orchestration | missing |
| Database-backed persistence | missing |
| Integrated JS test coverage | missing |
| Integrated Python dependency manifest | missing |

## Planned-Only or Placeholder

`validateCanonicalJob()` returns `futureHooks`, but they are placeholders only.

Placeholder areas:

- shape validation
- accessory existence validation
- drift detection

## Immediate Architectural Risks

- staged run accumulation without cleanup policy
- direct manual CLI runs can bypass server-side staging
- duplicate filename stem pairing risk
- internal mirror control residue in Job Builder
- naming drift between active code and stale examples
- `package.json` still uses the name `nanobanana-test`
