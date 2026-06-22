# ServiceOS Production Specification & Architecture Index

This directory serves as the authoritative architectural blueprint, business rules schema, database plan, and development roadmaps for the ServiceOS multi-tenant SaaS platform.

---

## 1. Document & Task Tree Structure

```
AI_DEVELOPMENT_RULES.md          # Global AI coding standards & folder layouts
docs/
├── product/
│   ├── 01-product-vision.md      # Product mission and target positioning
│   ├── 02-product-goals.md       # Strategic goals, OKRs, and phase definitions
│   ├── 03-business-model.md      # Unit economics, subscriptions, and GTM funnel
│   ├── 04-pricing-strategy.md    # Tier structures, limits, and competitive positioning
│   ├── 05-business-types-analysis.md # Restaurant, Clinic, Salon, Repair profiles
│   ├── 06-user-personas.md       # Persona demographics, goals, and metrics
│   ├── 07-use-cases.md           # 12 core functional use cases
│   ├── 08-user-journeys.md       # Visual maps of customer/staff flows
│   └── 09-customer-journey.md    # User lifecycle, churn triggers, and NPS
├── domain/
│   ├── 01-tenant.md              # Tenant entity fields, rules, and events
│   ├── 02-branch.md              # Branch hours and operating structures
│   ├── 03-user.md                # User profiles and status lifecycles
│   ├── 04-role.md                # RBAC permission matrix and Custom Claims
│   ├── 05-service.md             # Services, custom fields, and limits
│   ├── 06-resource.md            # Counters, doctor offices, stylist tables
│   ├── 07-queue.md               # QueueItem schema, history, and status
│   ├── 08-workflow.md            # Workflow templates, sequence mappings
│   ├── 09-workflow-stage.md      # Workflow stages, transition rules, and guards
│   ├── 10-appointment.md         # Appointment bookings, check-in, no-shows
│   ├── 11-notification.md        # SMS, email, webhook delivery channels
│   ├── 12-subscription.md        # Billing states, stripe IDs, and limit controls
│   └── 13-audit-log.md           # Audit logs structure, retention policy
├── business-rules/
│   ├── 01-queue-rules.md         # Ticket join, call, start, complete rules
│   ├── 02-workflow-rules.md      # Transition advances, assignments, validation
│   ├── 03-appointment-rules.md   # Double-booking check, check-in window rules
│   ├── 04-billing-rules.md       # Limit checks, payment suspensions, SMS overage
│   ├── 05-permission-rules.md    # Token claims validation, escalation blocks
│   └── 06-branch-rules.md        # Local operating hours, midnight resets
├── workflow/
│   ├── 01-engine-architecture.md # Generic state machine, events, and guards
│   ├── 02-restaurant-workflow.md # Waiting Table → Seated → Completed
│   ├── 03-clinic-workflow.md     # Registration → Screening → Doctor → Payment → Pharmacy
│   ├── 04-salon-workflow.md      # Waiting → Stylist → Payment → Completed
│   └── 05-repair-workflow.md     # Received → Diagnosis → Repair → Pickup → Completed
├── database/
│   ├── 01-schema-structure.md    # Firestore schema, interfaces, models
│   ├── 02-query-patterns-indexes.md # Core queries, index JSON mappings
│   └── 03-scalability-cost.md    # Sharded counters, reads/writes cost projection
├── security/
│   ├── 01-tenant-isolation.md    # Multi-tenancy architecture, data ownership
│   └── 02-security-rules.md      # Concrete firestore.rules script mapping RBAC
├── architecture/
│   ├── 01-system-overview.md     # Frontend modules, backend serverless tech
│   └── 02-patterns-layers.md     # Service layer, Repository pattern, Monitoring
├── frontend/
│   ├── 01-navigation-layouts.md  # Route mapping, responsive screen targets
│   └── 02-components-styling.md  # Atomic components, state management, tokens
├── roadmap/
│   ├── 01-mvp-roadmap.md         # Sprint 1 - 4 MVP deliverables
│   └── 02-post-mvp-roadmap.md    # V2 - V5 feature timelines
└── tasks/
    ├── 01-epic-tenant-auth.md    # TS tasks (Auth & Claims)
    ├── 02-epic-queue-core.md     # QC tasks (Queue logic)
    ├── 03-epic-workflow-engine.md # WF tasks (Workflow logic)
    └── 04-epic-appointments.md   # AP tasks (Appointment scheduling)
```

---

## 2. Platform Risk Assessment

### 2.1 Technical Security Risks
- **Risk**: Tenant token synchronization latency. If an admin changes a user's role, the local Firebase Auth token retains old permissions until refreshed.
- **Mitigation**: Implement automatic error interceptors in the frontend. When Firestore queries reject with `permission-denied`, trigger a silent token refresh (`getIdToken(true)`) to re-sync claims.

### 2.2 Technical Debt Risks
- **Risk**: Over-reliance on Client-side updates. Running status transitions directly from the React client bypasses centralized state checks.
- **Mitigation**: Enforce critical transitions (e.g. Workflow Stage progressions, Appointment Check-ins) through secure Firestore Cloud Functions. Lock down Firestore collections using read-only rules for non-conforming updates.

### 2.3 Scalability Risks
- **Risk**: Single document write throttling. The Firestore write limit of 1 update per second can lock branches issuing high numbers of concurrent walk-in tickets.
- **Mitigation**: Implement transaction blocks to increment daily ticket sequence counters. For enterprise tier tenants, run sharded counters to distribute the daily sequence increment across 5 shards.