# Runtime Flow

## Entry Point

The runtime runner is `edit.js`.

## Execution Flow

1. Load job
2. Call `buildPrompt(job)`
3. Call `resolveReferences(canonicalJob)`
4. Upload target image and resolved reference images
5. Build request parts
6. Write JSONL
7. Submit batch
8. Poll and download results

## Runtime Rule

The runtime does not decide behavior; it executes compiled decisions.
