## Paper context maintenance
This project is being written up as an academic paper. After any change that affects
architecture, design decisions, features, or evaluation results, update PAPER_CONTEXT.md:
- Edit the relevant sections so they describe the CURRENT system (not history)
- Add a dated entry to the "Changelog" section at the bottom: what changed, why,
  and which paper sections it likely affects
Do not update it for trivial changes (typos, formatting, minor refactors).

Keep the conventions already in PAPER_CONTEXT.md: cite claims as `path:line`, mark anything
not verified in code as [INFERRED], and re-check line numbers in the sections you touch, since
edits elsewhere in a file shift them.
