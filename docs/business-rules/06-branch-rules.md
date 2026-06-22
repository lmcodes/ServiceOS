# ServiceOS — Branch Business Rules

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## BHR-01: Daily Counter Reset

### Description
Resets daily queue numbers and counters for all active branches to 0 at midnight.

### Preconditions
- The current time reaches 00:00 (midnight) in the branch's local timezone.

### Actions
1. A scheduled Cloud Function runs every hour (on the hour) checking for branches whose timezone local time has reached midnight.
2. For each branch matching the criteria:
   - Reset `currentQueueNumber` to 0.
   - Archive any remaining non-completed active queues (e.g. automatically mark leftover `WAITING` or `CALLED` tickets as `EXPIRED` or `CANCELLED`).
   - Create a daily summary log in the analytics collection.

### Postconditions
- Branch daily number resets.
- Active queue list is cleared for the new day.

### Exceptions
- **E1: Long-Running Queues**: Certain business types (like Repair Shop) have queues that span multiple days. Action: Repair workflows are exempt from auto-cleanup; their status remains active, but the daily sequence number still resets.

---

## BHR-02: Operating Hours Validation

### Description
Prevents queue items from being created when a branch is closed.

### Preconditions
- A request to join the queue (QR or staff-created) is received.

### Actions
1. Retrieve the branch's `operatingHours` and `timezone` configuration.
2. Get the current time converted to the branch's local timezone.
3. Identify the current day of the week (e.g., `monday`).
4. Read the config for the day:
   - If `isOpen == false`: Reject the queue join request.
   - If `isOpen == true`: Check if `currentTime` is between `open` and `close` times.
5. If outside the window: Reject the queue join request.

### Postconditions
- Operation proceeds if open; blocked if closed.

### Exceptions
- **E1: Staff Override**: Logged-in staff members (Manager, Admin, Owner) can manually bypass operating hours checks to create walk-in tickets. Action: Allow creation, log as "Staff Override" in audit history.
