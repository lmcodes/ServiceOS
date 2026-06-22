# ServiceOS — Repair Shop Workflow Specification

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## 1. Flow Diagram

```
  [ Device Dropped Off ]
            │
            ▼
 ┌─────────────────────┐
 │      RECEIVED       │
 └─────────────────────┘
            │
            ▼
 ┌─────────────────────┐
 │      DIAGNOSIS      │
 └─────────────────────┘
            │
            │ (Action: Get Customer Approval)
            ▼
 ┌─────────────────────┐
 │       REPAIR        │
 └─────────────────────┘
            │
            ▼
 ┌─────────────────────┐
 │       PICKUP        │
 └─────────────────────┘
            │
            ▼
 ┌─────────────────────┐
 │      COMPLETED      │
 └─────────────────────┘
```

---

## 2. Stage Definitions

### Stage 1: RECEIVED
- **Purpose**: Intake of item, record serial number, description, and problem statement.
- **Allowed Resources**: Front Counter Staff.
- **Transitions**: `DIAGNOSIS`.

### Stage 2: DIAGNOSIS
- **Purpose**: Technician inspects item, finds issue, creates repair cost estimate.
- **Allowed Resources**: Technician (resource type: `staff` with category `technician`).
- **Transitions**: `REPAIR` (requires customer approval).

### Stage 3: REPAIR
- **Purpose**: Active repair/parts replacement.
- **Allowed Resources**: Technician.
- **Guards**: `customDataPresent` (requires `estimatedCost` to be filled and approval field to be `true`).
- **Transitions**: `PICKUP`.

### Stage 4: PICKUP
- **Purpose**: Item repaired, waiting in storage for customer to pick up and pay.
- **Allowed Resources**: Front Counter Staff.
- **Transitions**: `COMPLETED`.

### Stage 5: COMPLETED
- **Purpose**: Customer paid and picked up the item.
- **Terminal State**: Yes.

---

## 3. Transition Matrix

| Source Stage | Target Stage | Allowed Actor Roles | Guards | Actions |
|---|---|---|---|---|
| `RECEIVED` | `DIAGNOSIS` | `staff`, `manager` | None | Assign to technician queue |
| `DIAGNOSIS` | `REPAIR` | `staff` (technician) | Estimate filled, customer approved | Send SMS approval link, wait for customer flag to update |
| `REPAIR` | `PICKUP` | `staff` (technician) | Repair log notes filled | Send "Item Ready for Pickup" SMS, place item on holding shelf |
| `PICKUP` | `COMPLETED` | `staff` (receptionist) | None | Complete service, archive, log audit |

---

## 4. Notifications & Interaction Gates

### Customer Approval Gate (during Diagnosis)
1. Technician inputs: `estimatedCost: 1500`, `estimatedDurationDays: 2`.
2. System sends automated SMS: *"Your repair estimate is ready: ฿1500. Tap here to approve or decline: {approvalLink}"*
3. Customer opens link (no login) and clicks **Approve**.
4. Firestore document `customData.approvalStatus` updates to `approved`.
5. Guard validation passes, allowing transition to `REPAIR` stage.

### Ready for Pickup Notification
- **On entering PICKUP**: Send SMS: *"Great news! Your device is ready. Total cost: ฿{estimatedCost}. Please visit our counter to pick it up. Refer to Ticket: {queueNumber}"*
