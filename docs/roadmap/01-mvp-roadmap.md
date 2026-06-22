# MVP Development Roadmap

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## 1. MVP Scope Definition

The ServiceOS MVP focus is delivering a core single-step digital queue system. Advanced workflow configurations, appointments, and billing systems are scheduled for post-MVP releases to ensure rapid launch.

```
          ┌────────────────────────────────────────────────────────┐
          │                    MVP Deliverables                    │
          ├────────────────────────────────────────────────────────┤
          │  - Multi-Tenant & RBAC Auth                            │
          │  - Branch & Services Config                            │
          │  - QR Code Customer Queue Join                         │
          │  - Public TV Queue Display Screen                      │
          │  - Staff Queue Control Board                           │
          └────────────────────────────────────────────────────────┘
```

---

## 2. Sprint Schedule

Each sprint represents a 2-week development cycle.

### Sprint 1: Tenant & Authentication Foundation
- **Goal**: Establish tenant isolation models, databases, and login credentials.
- **Deliverables**:
  - Firebase project configuration and Firestore schema initiation.
  - User authentication routes (login, signup, password reset).
  - Custom claims injection trigger Cloud Function (injecting roles).
  - Basic dashboard layout wrapper with tenant validation.
- **Key Risks**: Claims injection synchronization latency on first login.

### Sprint 2: Branch & Services Setup Landlord Control
- **Goal**: Enable business owners to configure physical branches and active services.
- **Deliverables**:
  - Branch CRUD dashboard panel (operating hours, timezone settings).
  - Services CRUD dashboard panel (prefixes, expected durations, custom fields).
  - Database schema security rules locking modifications to owners/admins.
  - Printable QR code poster generation utility.

### Sprint 3: Customer QR & Staff Queue Console
- **Goal**: Build queue entry forms and teller console panels.
- **Deliverables**:
  - `/join/{branchId}` mobile view page for customer queue joining.
  - Real-time active queue query panel for staff dashboard.
  - Queue transaction actions: Call Next, Start Serving, Complete, No-Show.
  - Firestore Security Rules securing queue items.

### Sprint 4: TV display screen & Beta Testing
- **Goal**: Deliver the public display page and validate the system end-to-end.
- **Deliverables**:
  - `/display/{branchId}` TV-optimized layout with flashing animations and sound.
  - Customer ticket status page with real-time countdown updates.
  - 10-day test script verification.
  - Live deployment of MVP build to Firebase Hosting.
