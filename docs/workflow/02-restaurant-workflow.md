# ServiceOS — Restaurant Workflow Specification

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## 1. Flow Diagram

```
  [ Customer Joins ]
          │
          ▼
┌──────────────────┐
│  WAITING_TABLE   │
└──────────────────┘
          │
          │ (Guard: Table Assigned)
          ▼
┌──────────────────┐
│      SEATED      │
└──────────────────┘
          │
          │ (Action: Complete & Archive)
          ▼
┌──────────────────┐
│    COMPLETED     │
└──────────────────┘
```

---

## 2. Stage Definitions

### Stage 1: WAITING_TABLE
- **Purpose**: Customer is waiting for a table.
- **Allowed Resources**: Hostess / Front Desk staff.
- **Custom Fields Required**: `partySize` (number), `seatingPreference` (Indoor/Outdoor/Bar).
- **Transitions**: `SEATED`.

### Stage 2: SEATED
- **Purpose**: Customer is assigned a table and dining.
- **Allowed Resources**: Table (resource type: `table`).
- **Guards**: `resourceAssigned` (must match a table resource).
- **Transitions**: `COMPLETED`.

### Stage 3: COMPLETED
- **Purpose**: Dining completed, table freed.
- **Terminal State**: Yes.

---

## 3. Transition Matrix

| Source Stage | Target Stage | Allowed Actor Roles | Guards | Actions |
|---|---|---|---|---|
| `WAITING_TABLE` | `SEATED` | `owner`, `admin`, `manager`, `staff` | Table resource must be assigned and marked `busy` | Set `servingStartedAt`, update table state to `busy` |
| `SEATED` | `COMPLETED` | `owner`, `admin`, `manager`, `staff` | None | Set `completedAt`, update table state to `available` |

---

## 4. Notifications

- **On entering WAITING_TABLE**: Send SMS confirmation: *"Thanks! You're in line. Party size: {partySize}. Track here: {link}"*
- **On transitioning to SEATED**: Send notification: *"Your table is ready! Please proceed to the hostess desk."*
