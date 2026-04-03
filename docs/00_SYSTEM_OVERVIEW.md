# System Overview

Retouchio is a job-driven image production system.

The active production spine is:

`job -> compiler -> reference resolver -> runtime runner -> batch output`

Current runtime center:

- Job input defines behavioral intent.
- The modular prompt compiler converts that intent into a compiled prompt.
- The entity-driven reference resolver converts canonical entities into image references.
- The runtime runner in `edit.js` uploads the target image and resolved references, assembles request parts, writes JSONL, and submits the Gemini batch job.
- `batch_poll_download.js` handles polling and download after submission.

Current state:

- Prompt generation is modular.
- The canonical job schema is the source of behavioral truth.
- Reference routing is entity-driven.
- The default global base prompt is a strict cleanup layer: no redesign, no accessory injection, limited pose correction only.
- The system now exposes multiple internal tool surfaces under a shared shell.
- Job Builder, Asset Manager, and Target Inputs are now part of one internal console.
- The legacy slot system still exists, but only as a compatibility input bridge.

What this system is not:

- It is not a static prompt string generator.
- It is not a slot-driven runtime anymore.
- It is not Python-centered in production.
