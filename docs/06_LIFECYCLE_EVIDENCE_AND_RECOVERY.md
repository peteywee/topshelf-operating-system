# Lifecycle, Evidence, and Recovery

Lifecycle states are idea, discovery, prototype, internal_demo, release_candidate, authorized_pilot, production, general_availability, and retired. Transitions occur only through promotion contracts.

Evidence classes remain separate: automated, local manual, deployed or delivered, and external approval. Evidence is bound to an exact version, method, environment, timestamp, result, artifact, freshness period, and stated limitation.

Every material gate has a negative control. Deployable and migratable work requires rollback. Irreplaceable state requires backup and tested restore. Material failures require incident and, when qualifying, postmortem contracts.
