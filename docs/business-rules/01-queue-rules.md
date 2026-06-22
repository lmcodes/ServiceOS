# ServiceOS — Queue Business Rules

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## QR-01: Joining the Queue

### Description
Determines how a customer enters the queue (walk-in or QR scan) and gets assigned a queue number.

### Preconditions
- The branch is currently active and within operating hours.
- The selected service is active and available at this branch.
- The branch daily limit or tenant subscription limit has not been reached.
- If `settings.requirePhone` is true, a valid phone number is provided.

### Actions
1. Read current daily running number counter (`currentQueueNumber`) for the branch.
2. Increment `currentQueueNumber` and update the branch document.
3. Construct the queue number (e.g. `service.queuePrefix` or `branch.queuePrefix` + current counter formatted to 3 digits like `A042`).
4. Calculate initial `sequenceNumber` to establish FIFO order.
5. Create a `QueueItem` document with status `WAITING` and `priority: 0` (or computed priority if appointment).
6. Return confirmation payload to customer device containing estimated wait time.

### Postconditions
- A new `QueueItem` exists in the system with status `WAITING`.
- Branch `currentQueueNumber` has been incremented by 1.
- Public display screen shows updated "waiting count" count.

### Exceptions
- **E1: Closed Hours**: Customer attempts to join outside operating hours. Action: Reject submission and return "Branch is closed" message.
- **E2: Plan Limit Reached**: The tenant has reached their maximum daily queue limit for their subscription tier. Action: Reject submission and display "Queue Capacity Reached" to customer. Prompt owner to upgrade.
- **E3: Required Information Missing**: Name or phone is missing. Action: Return input validation error.

---

## QR-02: Calling a Queue Item (Staff Action)

### Description
Staff summons the next customer in the queue to be served.

### Preconditions
- The logged-in staff member has access to the branch.
- There is at least one `QueueItem` in the `WAITING` status.
- The staff member is not currently serving a customer (unless concurrent serving is enabled).

### Actions
1. Retrieve the oldest `QueueItem` matching the staff member's service capabilities, sorting by `priority` descending and `sequenceNumber` ascending.
2. Update the selected `QueueItem` status to `CALLED`.
3. Set `calledAt` timestamp, `calledByUserId` to staff UID, and increment `calledCount` by 1.
4. Trigger real-time notification update for display screens (display will play a sound and flash the number).
5. If SMS channel is enabled and phone is present, trigger a Cloud Function to send "Your turn" SMS.

### Postconditions
- The selected `QueueItem` has status `CALLED`.
- Display screen updates active board.
- The item remains in `CALLED` state until customer arrives, is skipped (no-show), or canceled.

### Exceptions
- **E1: Queue Empty**: No `WAITING` items are present. Action: Return "No customers waiting" message.
- **E2: Concurrent Limit**: Staff member attempts to call another customer while holding a `SERVING` ticket. Action: Reject unless setting `allowConcurrentServing` is true.

---

## QR-03: Starting Service

### Description
Transitioning a customer from called to active service.

### Preconditions
- The `QueueItem` is in the `CALLED` status.
- The staff member triggering the action is the one who called this customer.

### Actions
1. Update `QueueItem` status to `SERVING`.
2. Set `servingStartedAt` to current server timestamp.
3. Set assigned resource (e.g. counter number or staff room ID) status to `busy`.

### Postconditions
- `QueueItem` status is `SERVING`.
- Resource availability reflects `busy`.

### Exceptions
- **E1: Wrong Staff**: A different staff member tries to start service. Action: Reject write request.

---

## QR-04: Completing Service (Terminal State)

### Description
Service has been successfully delivered and the customer is removed from the active queue.

### Preconditions
- The `QueueItem` is in the `SERVING` status.

### Actions
1. Update `QueueItem` status to `COMPLETED`.
2. Set `completedAt` to current server timestamp.
3. Calculate duration: `duration = completedAt - servingStartedAt`.
4. Free the assigned resource: set status back to `available`.
5. Write event to `AuditLog`.
6. Update daily aggregator metrics.

### Postconditions
- `QueueItem` status is `COMPLETED` (cannot transition further).
- Resource status is `available`.

### Exceptions
- None (system must gracefully handle completes).

---

## QR-05: Marking No-Show (Terminal State)

### Description
Customer was called but did not show up within the grace period.

### Preconditions
- The `QueueItem` is in the `CALLED` status.
- Current time is past `calledAt` + `settings.noShowTimeoutMinutes`.

### Actions
1. Update `QueueItem` status to `NO_SHOW`.
2. Set `noShowAt` to current server timestamp.
3. Free resources and staff linked to the ticket.
4. Record audit event.

### Postconditions
- `QueueItem` status is `NO_SHOW`.
- Metrics record incremented no-show rate.

### Exceptions
- **E1: Premature Trigger**: Staff triggers no-show before the timeout duration has passed. Action: Reject unless staff overrides with role manager/admin.
