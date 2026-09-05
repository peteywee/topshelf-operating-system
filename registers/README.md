# Register Authority

The CSV files in this directory are not automatically canonical merely because they are named registers.

## Decision register

`registers/decision-register.csv` is a **frozen historical artifact** from the TopShelf Operating System Foundation Contract Package 2.0.0 dated 2026-07-23. It is retained byte-for-byte so the historical package manifest and evidence remain reproducible.

It is **noncanonical**. The `TOS-DEC-*` values inside that CSV are historical package-local labels and may conflict with later canonical decision IDs. They must not be used to resolve current TOS decisions, infer supersession, or select the next canonical decision ID.

The only canonical authority for current `TOS-DEC-*` records is:

```text
.tos/decisions.yaml
```

Machine-readable classification and the frozen SHA-256 are recorded in `registers/register-authority.json`. `pnpm check` verifies that the historical CSV remains unchanged, remains classified as noncanonical, remains tied to the historical package manifest, and that no additional decision CSV appears without classification.

## Change rule

- New or updated TOS decisions go through `.tos/decisions.yaml` and its schema-backed validation.
- Do not update the frozen CSV to make historical text look current.
- Do not reuse the frozen CSV as a second source of truth.
- If a future derived decision register is introduced, it must be generated from `.tos/decisions.yaml` and receive an explicit machine-enforced classification before adoption.
