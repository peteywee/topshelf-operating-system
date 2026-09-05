# TOS 0.2 Decision Schema Alignment

**Tracking issue:** #21  
**Status:** implementation candidate

## Problem

`.tos/decisions.yaml` is canonical decision state, but `schemas/decision.schema.json` previously described a different object shape (`decision_id`, `statement`, `rationale`, `consequences`). The kernel did not validate canonical decision records against that schema.

That created two incompatible machine contracts for the same concept.

## Resolution

The existing `.tos/decisions.yaml` record shape is retained as canonical **decision record v1** because it contains the historical decisions actually used by TOS. The JSON Schema is changed to describe that real record shape, and canonical project validation now executes schema-backed decision validation.

The v1 required fields are:

- `id`
- `title`
- `status`
- `authority`
- `decided_on`
- `decision`
- `evidence`

Optional fields include `rationale`, `consequences`, `supersedes`, and `supersedes_legacy_labels`.

The schema carries `x-tos-schema-version: 1`, which must match `.tos/decisions.yaml` `schema_version: 1`.

## Historical compatibility

No historical decision statement, authority, date, status, or evidence is fabricated or deleted.

`TOS-DEC-001` previously used:

```yaml
supersedes:
  - TopShelf Op Sys
```

`TopShelf Op Sys` is a legacy product label, not a `TOS-DEC-*` decision record. The value is therefore preserved as:

```yaml
supersedes_legacy_labels:
  - TopShelf Op Sys
```

This makes `supersedes` exclusively decision-to-decision and allows broken decision references, self-supersession, incorrect superseded status, and cycles to fail validation.

`TOS-DEC-016 -> TOS-DEC-002` remains the canonical decision supersession relationship.

## Validation behavior

Canonical validation rejects at least:

- missing required fields;
- invalid decision status;
- malformed decision IDs;
- unknown/additional record fields;
- duplicate decision IDs;
- missing superseded decision references;
- self-supersession;
- supersession targets not marked `superseded`;
- supersession cycles;
- schema/catalog version mismatch.

A committed invalid fixture proves a decision missing `authority` is rejected.

## JSON-first compatibility

This change does **not** claim YAML-to-JSON migration is complete. YAML remains the current canonical serialization for `.tos/decisions.yaml`; after parsing, its decision objects are governed by the explicit JSON Schema. A future serialization migration can preserve the same v1 object contract or introduce a separately versioned successor through controlled change.

## Negative controls

- Do not maintain a second undocumented decision object shape.
- Do not fabricate missing rationale or consequences for historical decisions.
- Do not delete historical decisions to satisfy validation.
- Do not treat non-decision labels as decision supersession IDs.
- Do not claim the broader JSON-first migration is complete from this bounded fix.
