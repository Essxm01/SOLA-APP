# KONFRM decision and conflict register

**Status vocabulary:** `Active`, `Resolved by higher authority`, `Needs Founder decision`, `Evidence gap`.

| ID | Subject | Source A | Source B | Current precedence assessment | Impact | Blocks execution? | Founder decision? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DC-01 | Source precedence | Original `AGENTS.md`: code/migrations first | Master §4: latest explicit Founder decision first | Master governs intent; code/migrations remain implementation/persistence evidence. | All work | No | No |
| DC-02 | Icon family | Existing implementation uses Lucide | Master §5.4: icon family not final Founder-approved | Current Design System docs now describe Lucide as implementation evidence only. Do not broaden/mass-migrate. | UI migration | Yes for icon-system migration | Yes |
| DC-03 | Deployment direction/config | Product Context/Master: Cloudflare primary | Root `.env.example`, root `wrangler.json`, legacy plans: Vercel/alternate Worker references | Cloudflare is intended direction; active service/revision must be live-verified. | Deployment-sensitive phases | Yes for live claims | No |
| DC-04 | OTP prototype access | Legacy plans reference OTP | Master §5.2 and Arabic PHASE 0 remove OTP as prototype blocker | Newer prototype override governs. | Authentication | No | No |
| DC-05 | Legacy SOLA/mock/financial behavior | `SOLA_EXECUTION_TASKS.md`, `implementation_plan.md`, older backend docs | Product Context/Master/current code | Preserve history; never reuse without verification. | All legacy touchpoints | No | No |
| DC-06 | DB baseline and RLS | Retained migrations start at 008 | Need full schema/RLS assurance | No source proves complete history/RLS. Require read-only audit before certifying. | DB/security work | Yes for assurance/migration work | No |
| DC-07 | Property/lifecycle labels | Product Context conceptual states | Current code/docs contain backend enum/legacy labels | Inspect current endpoint/enums first; map only with evidence. | Property UX/API | No | No |
| DC-08 | Cancellation/payment policy | Product Context gives deposit and payout accounting rules | Deadlines, remaining-payment method, and most cancellation/refund matrix rules are open | Confirmed prototype payout release/minimum/fee rules govern now; only genuinely open policy cannot be inferred. | Booking/payment/cancellation work | Yes—for open policy only | Yes |
| DC-09 | Current task sequencing | Former `tasks/CURRENT_TASK.md`: Owner Bookings in progress | Execution map: P0.1 is earliest unresolved prerequisite | Task contract now marks reconciliation complete and P0.1 recommended only; Owner Bookings remains implementation evidence. | Sequencing | No | No |
| DC-10 | KYC status wording | Older docs include stale first-run/verification language | Migration 020/current KYC implementation evidence | Preserve old documents; use current code/migration for implementation reality. | KYC support | No | No |
| DC-11 | Dated Experience audits presented as current | Experience audit/inventory/migration documents dated 2026-08-23 | Current reality/matrix after subsequent slices | Added historical-snapshot routing; preserve audit evidence without treating it as current status. | UX sequencing | No | No |
| DC-12 | Historical operational specifications claiming authority | Legacy plans and `backend/docs/PHASE_7_MASTER_SPECIFICATION.md` use authoritative/current wording | Master rules and docs index | Preserve historical material; routing docs explicitly subordinate it to current governance. | All future work | No | No |

Add entries rather than rewriting the original source when new contradictions appear.
