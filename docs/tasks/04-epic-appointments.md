# Epic: Appointment Management

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## 1. Feature: Customer Booking Calendar

### Story: Self-Service Appointment Booking
*As a customer, I want to book a specific service and time slot online, so that I don't have to wait in line on arrival.*

- **Task ID**: `AP-01`
- **Estimated Complexity**: High (8 story points)
- **Dependencies**: `QC-01`
- **Description**: Public route `/booking/{branchId}` showing calendar grids, fetching slot availability, and creating confirmed bookings.

#### Subtasks
- [ ] Create booking layout containing Calendar picker component.
- [ ] Implement booking slots availability checker Cloud Function (checking overlapping dates and operating hours).
- [ ] Build booking confirmation form (email, phone, name fields).
- [ ] Write appointment confirmation to `/appointments`.

#### Acceptance Criteria
- Customers can select valid dates and time slots.
- Overlapping booking requests on the same resource are rejected.
- Successful bookings create a document with status `CONFIRMED`.

---

## 2. Feature: Appointment Arrival Check-In

### Story: Appointment Checked-In to Queue
*As a receptionist, I want to check in an arriving scheduled customer, so that they enter the active queue with priority.*

- **Task ID**: `AP-02`
- **Estimated Complexity**: Medium (5 story points)
- **Dependencies**: `AP-01`, `QC-02`
- **Description**: Check-in button in reception console that transitions appointment states and creates high-priority queue items.

#### Subtasks
- [ ] Build appointments check-in interface listing today's bookings.
- [ ] Implement "Check In" helper: updates appointment status to `CHECKED_IN`, logs check-in time.
- [ ] Create corresponding `QueueItem` with `priority: 5` (above walk-ins).
- [ ] Send SMS reminder to user on successful check-in.

#### Acceptance Criteria
- Checking in a booking updates the appointment status and spawns a queue ticket.
- Spawned queue item has `priority: 5` and sequence mapping.
- Bypasses standard check-in constraints.
