# Information architecture authority

For every major screen, use this template before a migration:

| Field | Question it answers |
|---|---|
| Primary user question | What must this role know or decide now? |
| Primary data | Minimum canonical facts required to answer it. |
| Primary action | The one most relevant valid next action. |
| Secondary data | Useful context after the main answer. |
| Secondary actions | Helpful but non-dominant actions. |
| Hidden/detail data | Available through explicit progressive disclosure. |
| Not for this role | Data that is internal, irrelevant or permission-restricted. |

Shared composition is **page header → context/summary → primary content → action area → supporting content → secondary details → state feedback**. Customer adapts it toward real imagery and choice; Owner toward active work and status; Admin toward review context and queue density.

No screen may use a metric, an action or a status simply because another role needs it.
