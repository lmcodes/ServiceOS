# ServiceOS — Workflow Engine Business Rules

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## WR-01: Workflow Initialization

### Description
Configures how a queue item transitions from a basic queue item into a workflow-tracked multi-step item.

### Preconditions
- The selected `Service` has a non-empty `workflowId` reference.
- The `Workflow` referenced exists and is active.
- The `Workflow` contains at least two stages in `stageIds`.

### Actions
1. Retrieve the list of stage IDs from the workflow template.
2. Set the `QueueItem.workflowId` field to the workflow template ID.
3. Identify the initial stage (typically index 0 in the ordered `stageIds` array).
4. Set `QueueItem.currentStageId` to the initial stage ID.
5. Initialize the `QueueItem.workflowHistory` array with an entry representing the initial stage entry:
   - `stageId`: initial stage ID
   - `enteredAt`: current timestamp
   - `exitedAt`: null
   - `assignedUserId`: null
   - `assignedResourceId`: null

### Postconditions
- The `QueueItem` is now bound to a workflow.
- The item is visible to the staff assigned to the first workflow stage.

### Exceptions
- **E1: Missing Template**: Workflow ID on the service points to a missing or inactive workflow. Action: Revert to standard queue item without stages (fallback behavior) and log a system warning.

---

## WR-02: Advancing Workflow Stages

### Description
Handles moving a queue item from its current stage to the next step in the configured path.

### Preconditions
- The `QueueItem` has an active `workflowId` and `currentStageId`.
- The current status of the queue item is `SERVING` or `CALLED` at the current stage.
- The target `stageId` exists in the workflow.
- Unless `allowCustomTransitions` is true:
  - The target `stageId` must be listed in `transitionRules.nextStages` for the current stage.

### Actions
1. Locate the active stage entry in the `QueueItem.workflowHistory` array (where `exitedAt` is null).
2. Set `exitedAt` to the current timestamp.
3. Calculate the duration spent in the stage: `durationSeconds = exitedAt - enteredAt`.
4. Append a new stage entry to `QueueItem.workflowHistory` with:
   - `stageId`: target stage ID
   - `enteredAt`: current timestamp
   - `exitedAt`: null
   - `assignedUserId`: null
   - `assignedResourceId`: null
5. Update `QueueItem.currentStageId` to the target stage ID.
6. Set `QueueItem.status` back to `WAITING` (signaling that the customer is waiting for the next step).
7. Clear `calledByUserId` and `assignedResourceId` to prepare for assignment in the new stage.

### Postconditions
- `QueueItem.currentStageId` is updated.
- The item returns to `WAITING` status under the new stage context.
- Staff assigned to the target stage see the item in their queue lists.

### Exceptions
- **E1: Invalid Transition**: Target stage is not a valid successor in the state machine, and custom transitions are disabled. Action: Block transition, return "Invalid workflow progression" error.
- **E2: Item Cancelled**: Item status changes to cancelled while in a workflow. Action: Mark current stage entry as exited, set `QueueItem.status` to `CANCELLED`, and terminate workflow execution.

---

## WR-03: Stage Assignment and Resource Binding

### Description
Assigns a specific staff member or physical resource to a queue item during its current stage.

### Preconditions
- The `QueueItem` is active within a workflow stage.
- The resource or user to be assigned is compatible with the stage's `allowedResourceTypes` (if specified).
- The resource or user is active and available.

### Actions
1. Set the active stage entry's `assignedUserId` or `assignedResourceId` in the `workflowHistory` array.
2. Update the parent `QueueItem.assignedResourceId` field.
3. Update the resource status to `busy` (if a physical resource is assigned).

### Postconditions
- The queue item stage is bound to the resource.
- The resource is locked to this customer.

### Exceptions
- **E1: Incompatible Resource Type**: Staff member attempts to assign a resource whose type is not permitted for this stage (e.g., assigning a nurse to a doctor consultation stage). Action: Block assignment and return error.
