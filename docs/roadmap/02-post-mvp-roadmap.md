# Post-MVP Lifecycle Roadmap (V2 — V5)

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## 1. Release Timeline Overview

The post-MVP strategy adds complexity iteratively, transforming a basic queue ticketing system into an operating system for service businesses.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Version V2  │ ──▶ │  Version V3  │ ──▶ │  Version V4  │ ──▶ │  Version V5  │
│  - Workflow  │     │  - Booking   │     │  - Analytics │     │  - Webhooks  │
│  - Multi-Step│     │  - Reminders │     │  - SMS Overage│     │  - Enterprise│
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

---

## 2. Version Details

### V2: Multi-Step Workflow Engine
- **Primary Goal**: Transition from simple single-step queues to multi-step process workflows.
- **Key Features**:
  - Metadata-driven Workflow Stage configuration dashboards.
  - Multi-stage queue progression state machine.
  - Custom stage transition buttons on staff dashboards.
  - Real-time display screens filtering lists by current stage.
- **Timeline**: 6-8 weeks post-MVP.

### V3: Appointment Scheduler & Reminders
- **Primary Goal**: Blend walk-in queues with scheduled appointments.
- **Key Features**:
  - Customer self-service booking page with slot availability calculations.
  - Integration with Twilio SMS dispatch for booking confirmations.
  - Auto-check-in to priority queues on customer arrival.
  - Email calendar invite generation (.ics support).
- **Timeline**: 8-10 weeks post-V2.

### V4: Core Analytics & Billing Plans
- **Primary Goal**: Monetize the platform and surface operational insights.
- **Key Features**:
  - Stripe integration (metered pricing, starter, professional subscription plans).
  - Stripe billing portals access links for tenant profiles.
  - Tenant analytics panel (wait times, throughput trends, busiest hours).
  - Branch-level PDF daily summary report exports.
- **Timeline**: 6-8 weeks post-V3.

### V5: Developer Portal (API & Webhooks)
- **Primary Goal**: Transform ServiceOS into an extensible platform.
- **Key Features**:
  - Developer setting tab generating API tokens (OAuth / Bearer tokens).
  - Public REST API endpoints for queue operations (CRUD).
  - Outbound Webhooks system (firing on queue status changes, check-ins).
  - Custom branding and white-label layout themes for enterprise customers.
- **Timeline**: 12-16 weeks post-V4.
