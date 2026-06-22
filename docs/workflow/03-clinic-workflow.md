# ServiceOS — Clinic Workflow Specification

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## 1. Flow Diagram

```
  [ Patient Checked-In ]
            │
            ▼
 ┌─────────────────────┐
 │    REGISTRATION     │
 └─────────────────────┘
            │
            ▼
 ┌─────────────────────┐
 │      SCREENING      │
 └─────────────────────┘
            │
            │ (Guard: Vitals Custom Data)
            ▼
 ┌─────────────────────┐
 │       DOCTOR        │
 └─────────────────────┘
            │
            ▼
 ┌─────────────────────┐
 │       PAYMENT       │
 └─────────────────────┘
            │
            ▼
 ┌─────────────────────┐
 │      PHARMACY       │
 └─────────────────────┘
            │
            ▼
 ┌─────────────────────┐
 │      COMPLETED      │
 └─────────────────────┘
```

---

## 2. Stage Definitions

### Stage 1: REGISTRATION
- **Purpose**: Patient check-in, info confirmation, insurance check.
- **Allowed Resources**: Front Desk Staff.
- **Transitions**: `SCREENING`.

### Stage 2: SCREENING
- **Purpose**: Nurse records vitals (weight, blood pressure, temperature).
- **Allowed Resources**: Nurse (resource type: `staff` with category `nurse`).
- **Transitions**: `DOCTOR`.

### Stage 3: DOCTOR
- **Purpose**: Consultation with assigned doctor.
- **Allowed Resources**: Doctor (resource type: `staff` with category `doctor` or specific `resourceId`).
- **Guards**: `customDataPresent` (requires `bloodPressure`, `temperature` to be filled during Screening).
- **Transitions**: `PAYMENT`.

### Stage 4: PAYMENT
- **Purpose**: Settlement of consultation fees.
- **Allowed Resources**: Cashier / Counter (resource type: `counter`).
- **Transitions**: `PHARMACY`.

### Stage 5: PHARMACY
- **Purpose**: Prescription pickup.
- **Allowed Resources**: Pharmacist / Pharmacy counter (resource type: `counter`).
- **Transitions**: `COMPLETED`.

### Stage 6: COMPLETED
- **Purpose**: Patient leaves the clinic.
- **Terminal State**: Yes.

---

## 3. Transition Matrix

| Source Stage | Target Stage | Allowed Actor Roles | Guards | Actions |
|---|---|---|---|---|
| `REGISTRATION` | `SCREENING` | `staff`, `manager` | None | Advance patient to screening queue |
| `SCREENING` | `DOCTOR` | `staff` (nurse) | Vitals signs recorded | Prompt selection of target Doctor resource |
| `DOCTOR` | `PAYMENT` | `staff` (doctor) | Consultation notes filled | Send payment summary details to Cashier queue |
| `PAYMENT` | `PHARMACY` | `staff` (cashier) | Billing invoice marked Paid | Route patient to pharmacy pickup lane |
| `PHARMACY` | `COMPLETED` | `staff` (pharmacist) | None | Complete service, record duration |

---

## 4. Notifications

- **On entering SCREENING**: Send message: *"Welcome! Please wait near the Screening Area. Nurse will call you shortly."*
- **On entering DOCTOR**: Send message: *"Dr. {doctorName} is ready for you in Room {roomNo}. Please walk in."*
- **On entering PAYMENT**: Send message: *"Your bill is ready. Please proceed to Cashier Counter 2."*
- **On entering PHARMACY**: Send message: *"Your prescription is being prepared. Wait at the Pharmacy window."*
