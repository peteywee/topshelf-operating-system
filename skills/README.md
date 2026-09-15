# TOS Skills

Skills are governed, reusable operating instructions for human-assisted roles and project work. They are technology-agnostic unless a skill explicitly says otherwise. Skills do not grant autonomous authority, owner approval, promotion authority, or permission to bypass applicable contracts.

## Default execution skill

### Batch → Verify → Activate

Path: `skills/batch-verify-activate/SKILL.md`  
Canonical workflow: `docs/governed/BATCH_VERIFY_ACTIVATE_WORKFLOW.md`

Use BVA as the default operating pattern for material implementation, release, migration, recovery, infrastructure, and activation work unless an explicit higher-authority contract or owner decision requires another workflow.

Core principle:

> **Batch aggressively. Verify in parallel. Activate narrowly. Prove independently.**

BVA is project-agnostic. Project adapters may specialize gate names, commands, providers, and evidence systems while preserving exact-candidate evidence, bounded activation, independent readback, negative proof, and owner-reserved authority.

## Other governed skills

- `skills/contract-auditor/SKILL.md` — independent contract audit.
- `skills/contract-steward/SKILL.md` — controlled contract stewardship.
- `skills/evidence-steward/SKILL.md` — evidence verification and stewardship.
- `skills/release-promotion-steward/SKILL.md` — release/promotion readiness without granting owner approval.
- `skills/truth-steward.skill.md` — decision-ready truth stewardship.

## Selection rule

For material implementation or operational change, start with BVA as the execution discipline and layer specialized skills on top when their concern applies. Specialized skills do not replace BVA's candidate/evidence/activation boundaries unless their governing contract explicitly does so.