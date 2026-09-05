# Register Authority

The CSV files in this directory are not automatically canonical merely because they are named registers.

## Decision register

`registers/decision-register.csv` is a **frozen historical artifact** from the TopShelf Operating System Foundation Contract Package 2.0.0 dated 2026-07-23.

It is **noncanonical**. The `TOS-DEC-*` values inside that CSV are historical package-local labels and may conflict with later canonical decision IDs. They must not be used to resolve current TOS decisions, infer supersession, or select the next canonical decision ID.

The only canonical authority for current `TOS-DEC-*` records is:

```text
.tos/decisions.yaml
```

### Historical integrity note

The current CSV is byte-identical to the copy stored at foundation evidence commit `80684d74793eb541cd493e9d8f5a94434b096539`; both resolve to Git blob `24c4f5c464e29d5c6d2bd73210fac934f189086f`.

The historical `TOS_PACKAGE_MANIFEST.json` nevertheless declares SHA-256 `0909b03c0827c710f532f708b69cebff2de1c39b80a91ea27b01bd14e027b93e` for that file, while the preserved CSV bytes actually hash to `e8cd5086f84daaa28eb4ee8063571a496a969a96b5a11497485f8eb4492681fa`.

That manifest discrepancy is preserved as historical metadata rather than silently rewriting the July package. `registers/register-authority.json` records both values, the original evidence commit, and the historical Git blob identity so the distinction between **file drift** and **incorrect historical manifest metadata** remains explicit.

`pnpm check` verifies that the historical CSV remains unchanged, remains classified as noncanonical, retains its historical blob identity, preserves the original manifest declaration, and that no additional decision CSV appears without classification.

## Change rule

- New or updated TOS decisions go through `.tos/decisions.yaml` and its schema-backed validation.
- Do not update the frozen CSV to make historical text look current.
- Do not rewrite the historical package manifest to conceal its original hash discrepancy.
- Do not reuse the frozen CSV as a second source of truth.
- If a future derived decision register is introduced, it must be generated from `.tos/decisions.yaml` and receive an explicit machine-enforced classification before adoption.
