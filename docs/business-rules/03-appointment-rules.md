# ServiceOS — Appointment Business Rules

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## AR-01: Slot Availability and Double-Booking Prevention

### Description
Ensures that new appointment requests do not overlap with existing bookings for the same resource.

### Preconditions
- The target date is within the allowed booking window (e.g. up to 30 days in advance).
- The requested `startTime` and `endTime` fall within the branch's operating hours for that day.
- The resource (if assigned/preferred) is active and has service matching capabilities.

### Actions
1. Query Firestore `appointments` collection for the tenant and branch where:
   - `scheduledDate == requestedDate`
   - `resourceId == requestedResourceId` (if resource specified)
   - `status` is one of `CONFIRMED`, `CHECKED_IN`
2. Perform an overlap check:
   - An overlap exists if `requestedStartTime < existingEndTime` AND `requestedEndTime > existingStartTime`.
3. If no overlap is detected, reserve the slot.

### Postconditions
- Slot is verified as open.
- The appointment document can be created.

### Exceptions
- **E1: Double Booking**: An overlapping appointment is found. Action: Reject booking, return "Time slot already booked" error.
- **E2: Outside Operating Hours**: Booking falls outside work hours. Action: Reject, return "Branch closed during requested times" error.

---

## AR-02: Self-Service Appointment Check-In

### Description
Converts an appointment into an active queue ticket when the customer arrives at the branch.

### Preconditions
- The appointment exists and has the status `CONFIRMED`.
- The current date matches `scheduledDate`.
- The current time is within the allowed check-in window (e.g., between 30 minutes before and 15 minutes after `startTime`).

### Actions
1. Update the appointment status from `CONFIRMED` to `CHECKED_IN`.
2. Set `checkInTime` to the current server timestamp.
3. Automatically create a new `QueueItem` with:
   - `tenantId` and `branchId` from the appointment.
   - `serviceId` from the appointment.
   - `customerName`, `customerPhone` from the appointment.
   - `status: WAITING`.
   - `priority: 5` (elevated priority to respect the scheduled time over standard walk-ins).
   - `customData.appointmentId`: appointment ID reference.
4. Generate the queue number and increment daily sequence.
5. Set `appointment.queueItemId` to the created queue item's ID.

### Postconditions
- Appointment status is `CHECKED_IN`.
- An active `QueueItem` is generated with elevated priority.
- Customer receives their queue ticket on screen.

### Exceptions
- **E1: Late Check-In**: Customer attempts check-in more than 15 minutes after their appointment start time. Action: Reject auto check-in. The customer must check in as a standard walk-in (priority 0) unless staff manually overrides it.
- **E2: Check-In Too Early**: Customer attempts check-in more than 30 minutes prior. Action: Show message "Check-in window opens at [Time]".

---

## AR-03: Auto-No-Show Resolution

### Description
Cleans up appointments that were never checked in, releasing the slot and keeping logs clean.

### Preconditions
- The appointment status is `CONFIRMED`.
- Current time is past `endTime` + 15 minutes.

### Actions
1. Query for all expired confirmed appointments daily/hourly via scheduled Cron Cloud Function.
2. Update appointment status from `CONFIRMED` to `NO_SHOW`.
3. Log audit event for tracking.

### Postconditions
- Expired appointments are archived to `NO_SHOW`.
- Slots are marked as freed.
