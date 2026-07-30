# RAID Entry and Escalation Record

## Item identification

| Field | Entry |
|---|---|
| RAID ID | `{{ID}}` |
| Type | `{{RISK / ASSUMPTION / ISSUE / DEPENDENCY}}` |
| Date identified | `{{YYYY-MM-DD}}` |
| Identified by | `{{NAME / ROLE}}` |
| Owner | `{{NAME / ROLE}}` |
| Status | `{{OPEN / MONITORING / MITIGATED / CLOSED / ACCEPTED}}` |
| Priority | `{{LOW / MEDIUM / HIGH / CRITICAL}}` |

## Description

`{{State the condition, event, uncertainty, assumption, issue, or dependency in precise terms.}}`

## Cause, event, and impact

- **Cause / source:** `{{DETAIL}}`
- **Potential or actual event:** `{{DETAIL}}`
- **Impact on objectives, scope, schedule, cost, quality, authority, security, or operations:** `{{DETAIL}}`

## Assessment

| Measure | Value | Basis |
|---|---:|---|
| Probability (1–5) | `{{1-5}}` | `{{RATIONALE}}` |
| Impact (1–5) | `{{1-5}}` | `{{RATIONALE}}` |
| Exposure score | `{{P × I}}` | `{{LOW / MEDIUM / HIGH / CRITICAL}}` |
| Urgency | `{{LOW / MEDIUM / HIGH / IMMEDIATE}}` | `{{RATIONALE}}` |

## Trigger or indicator

`{{Describe the observable event, threshold, date, failed control, or evidence that activates the response or escalation.}}`

## Response plan

| Response component | Entry |
|---|---|
| Strategy | `{{AVOID / MITIGATE / TRANSFER / ACCEPT / EXPLOIT / ENHANCE / RESOLVE / MONITOR}}` |
| Preventive action | `{{ACTION}}` |
| Contingent action | `{{ACTION}}` |
| Owner | `{{NAME}}` |
| Due date | `{{YYYY-MM-DD}}` |
| Required resources / authority | `{{DETAIL}}` |
| Closure evidence | `{{DETAIL}}` |

## Escalation

- Blocking current work: `{{YES / NO}}`
- Authority needed: `{{NAME / ROLE / NONE}}`
- Decision needed by: `{{YYYY-MM-DD / IMMEDIATE}}`
- Impact if not decided: `{{DETAIL}}`
- Stop-work required: `{{YES / NO}}`

## Residual position

| Field | Entry |
|---|---|
| Residual probability | `{{1-5}}` |
| Residual impact | `{{1-5}}` |
| Residual exposure | `{{SCORE / PRIORITY}}` |
| Accepted by | `{{AUTHORITY / N/A}}` |
| Acceptance duration / review trigger | `{{DETAIL}}` |

## Updates and closure

| Date | Update / evidence | Owner | Status |
|---:|---|---|---|
| `{{DATE}}` | `{{DETAIL}}` | `{{OWNER}}` | `{{STATUS}}` |

**Closure rationale:**  
`{{Explain why the item is closed, accepted, transferred, or superseded and identify any successor record.}}`
