# Business Rules

Tenant owns all data.
Branch belongs to one tenant.
Queue belongs to one branch.
Queue may optionally belong to a workflow.
All actions require audit logs.

Queue Status:
WAITING
CALLED
SERVING
COMPLETED
NO_SHOW
CANCELLED

Immutable Rules:
- Completed queue cannot return to waiting.
- Cancelled queue cannot be resumed.