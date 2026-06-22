# Epic: Core Queue Management & QR Check-In

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## 1. Feature: Branch & Services Setup

### Story: Branch and Service Configuration
*As a manager, I want to create physical branches and associate services with them, so that customers can check in.*

- **Task ID**: `QC-01`
- **Estimated Complexity**: Medium (5 story points)
- **Dependencies**: `TS-01`
- **Description**: Add creation dashboards for Branches and Services within the landlord dashboard.

#### Subtasks
- [ ] Build Branch CRUD forms (name, address, hours, timezone).
- [ ] Build Service CRUD forms (name, duration, fields array).
- [ ] Connect services collection with branch association logic.
- [ ] Generate unique QR poster link containing branch target URL.

#### Acceptance Criteria
- Owners can create new branches and view them in a list.
- Admin users can define services with distinct estimated durations.
- Operating hours validate correctly (end time after start time).

---

## 2. Feature: Customer QR Self Check-In

### Story: QR Code Queue Joining
*As a walk-in customer, I want to scan a QR code at the entrance to join the queue, so that I don't have to wait in line.*

- **Task ID**: `QC-02`
- **Estimated Complexity**: Medium (5 story points)
- **Dependencies**: `QC-01`
- **Description**: Public mobile view that parses `branchId` from url parameters, queries active services, and issues queue numbers.

#### Subtasks
- [ ] Create route `/join/{branchId}`.
- [ ] Build simple form showing active services.
- [ ] Build submission helper using Firestore transactions to increment daily counter.
- [ ] Create ticket page showing queue number and live position update card.

#### Acceptance Criteria
- Scanning the branch QR leads directly to the join form.
- Submitting the form creates a ticket with WAITING status, unique number (A001), and sets daily sequence number.
- Page updates in real-time if other tickets ahead are called.

---

## 3. Feature: Staff Queue Management Panel

### Story: Call Next & Process Queue
*As a teller, I want to call the next waiting customer and mark them complete, so that I can process them efficiently.*

- **Task ID**: `QC-03`
- **Estimated Complexity**: High (8 story points)
- **Dependencies**: `QC-02`
- **Description**: Staff console showing today's queues list, with buttons to Call, Start, Complete, or Skip (No-Show).

#### Subtasks
- [ ] Build Real-Time list query fetching active branch tickets.
- [ ] Implement "Call Next" transaction picking oldest WAITING ticket.
- [ ] Build control bar containing: "Call Next", "Start Serving", "Complete", and "No Show".
- [ ] Log status updates to audit collections.

#### Acceptance Criteria
- Tapping "Call Next" changes status of oldest WAITING ticket to CALLED.
- Completed tickets change status to COMPLETED and free the associated resource/counter.
- No-show action transitions status to NO_SHOW.
