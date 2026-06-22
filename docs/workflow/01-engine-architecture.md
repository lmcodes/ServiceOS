# ServiceOS — Workflow Engine Architecture

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## 1. Engine Core Design

The ServiceOS Workflow Engine is designed as a generic, metadata-driven state machine. It manages the progression of a `QueueItem` through multiple custom-configured `WorkflowStages`. Instead of hardcoding industry-specific logic, the engine evaluates transitions based on schema configurations, guards, and action execution.

```
                  ┌─────────────────────────────────┐
                  │            QueueItem            │
                  │  - status: WAITING/CALLED/etc.  │
                  │  - currentStageId: "screening"  │
                  └─────────────────────────────────┘
                                   │
                                   ▼
                      [ Transition Requested ]
                                   │
                                   ▼
                  ┌─────────────────────────────────┐
                  │         Workflow Engine         │
                  │                                 │
                  │   1. Validate currentStageId    │
                  │   2. Check Transition Rules     │
                  │   3. Evaluate Guards            │
                  │   4. Execute Pre-Actions        │
                  │   5. Update State & History     │
                  │   6. Trigger Events & Webhooks  │
                  └─────────────────────────────────┘
                                   │
                                   ▼
                  ┌─────────────────────────────────┐
                  │            QueueItem            │
                  │  - status: WAITING              │
                  │  - currentStageId: "doctor"     │
                  └─────────────────────────────────┘
```

---

## 2. State Machine Definition

A workflow is defined by:
- $S$: A set of stages (states) defined in the workflow's subcollection or array.
- $T$: A transition function $f(s_{current}, s_{target}) \to \{true, false\}$.
- $G$: Guards (preconditions) that must be satisfied before transition.
- $A$: Actions executed during transition.

### Generic State Schema
Each `WorkflowStage` document defines:
```json
{
  "id": "screening",
  "name": "Screening",
  "allowedResourceTypes": ["nurse"],
  "transitionRules": {
    "nextStages": ["doctor"],
    "allowSkip": false,
    "allowRevert": true
  },
  "guards": [
    {
      "type": "customDataPresent",
      "field": "vitalsSign"
    }
  ]
}
```

---

## 3. Transition Guards

Guards are conditional validation blocks executed before a transition is permitted. If any guard fails, the transition is blocked.

| Guard Type | Parameter | Description |
|---|---|---|
| `customDataPresent` | `field: string` | Checks if specific custom fields are filled in `QueueItem.customData`. |
| `resourceAssigned` | None | Verifies that a resource is currently bound to the stage. |
| `roleAuthorized` | `roles: string[]` | Ensures the actor triggering the transition holds a permitted role. |
| `minimumDuration` | `minutes: number` | Restricts progression until the item has spent a minimum time in the stage. |

---

## 4. Transition Events

When a transition completes successfully, the engine fires lifecycle events:

1. **`onExit(stageId)`**: Triggered when leaving the source stage. Used to calculate stage duration.
2. **`onTransition(from, to)`**: Triggered during transition. Logs history data.
3. **`onEntry(stageId)`**: Triggered when entering the target stage. Used to auto-assign resources or dispatch notifications.

---

## 5. Transition Validation Lifecycle

The engine processes a transition through the following pipeline:

```
[Request Stage Change]
         │
         ▼
[Check: Does target stage exist in Workflow stage list?] ─── No ──▶ [Error: Invalid Stage]
         │ Yes
         ▼
[Check: Is target stage in transitionRules.nextStages?] ─── No ──▶ [Check: is allowCustomTransitions true?]
         │ Yes                                                                 │ No
         ▼                                                                     ▼
[Evaluate Guards (e.g. check fields, resources)] ── Fails ──▶ [Error: Guard Validation Failed]
         │ Passes
         ▼
[Execute Exit Action for current stage] (calculate duration)
         │
         ▼
[Update QueueItem: status = WAITING, currentStageId = target, clear assignments]
         │
         ▼
[Execute Entry Action for target stage] (dispatch notifications, set resource types)
```
