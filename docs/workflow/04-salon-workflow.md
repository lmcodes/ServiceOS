# ServiceOS — Salon Workflow Specification

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## 1. Flow Diagram

```
  [ Customer Joins ]
          │
          ▼
┌──────────────────┐
│     WAITING      │
└──────────────────┘
          │
          │ (Guard: Stylist Assigned)
          ▼
┌──────────────────┐
│     STYLIST      │
└──────────────────┘
          │
          ▼
┌──────────────────┐
│     PAYMENT      │
└──────────────────┘
          │
          ▼
┌──────────────────┐
│    COMPLETED     │
└──────────────────┘
```

---

## 2. Stage Definitions

### Stage 1: WAITING
- **Purpose**: Customer waiting at reception.
- **Allowed Resources**: Receptionist.
- **Transitions**: `STYLIST`.

### Stage 2: STYLIST
- **Purpose**: Haircut, styling, or beauty treatment.
- **Allowed Resources**: Stylist (resource type: `person` with category `stylist`).
- **Guards**: `resourceAssigned` (must have an assigned stylist).
- **Transitions**: `PAYMENT`.

### Stage 3: PAYMENT
- **Purpose**: Payment for service.
- **Allowed Resources**: Reception / Counter.
- **Transitions**: `COMPLETED`.

### Stage 4: COMPLETED
- **Purpose**: Service finished.
- **Terminal State**: Yes.

---

## 3. Transition Matrix

| Source Stage | Target Stage | Allowed Actor Roles | Guards | Actions |
|---|---|---|---|---|
| `WAITING` | `STYLIST` | `staff`, `manager` | Stylist assigned | Set stylist to `busy`, record `servingStartedAt` |
| `STYLIST` | `PAYMENT` | `staff` (stylist) | None | Free stylist (set to `available`), route to cashier |
| `PAYMENT` | `COMPLETED` | `staff` (receptionist) | None | Mark ticket complete, log transaction |

---

## 4. Notifications

- **On entering STYLIST**: Send SMS: *"Your stylist {stylistName} is ready. Please proceed to Station {stationNumber}."*
- **On entering PAYMENT**: Send SMS: *"Service complete! Please visit the counter to finalize your payment."*
