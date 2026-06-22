# ServiceOS — Product Goals

> Version: 1.0
> Last Updated: 2026-06-22
> Status: Draft

---

## 1. Strategic Goals (12-Month Horizon)

### G1: Universal Queue Platform

**Objective:** Build a single queue management system that works across all target business types without code changes.

| KR | Target | Timeline |
|---|---|---|
| Support 5 business type templates | Restaurant, Clinic, Salon, Repair, Service Center | MVP |
| QR-based queue entry with < 3 taps | Customer scan → join → confirmed | MVP |
| Real-time display system | < 2s refresh latency | MVP |
| Average wait-time estimation | ±20% accuracy | V2 |

### G2: Configurable Workflow Engine

**Objective:** Deliver a generic workflow engine that models any multi-step service process as a configurable state machine.

| KR | Target | Timeline |
|---|---|---|
| Visual workflow builder | Drag-and-drop stage configuration | V2 |
| Pre-built templates for 5 business types | Ready-to-use on tenant creation | V2 |
| Stage-level assignment | Assign staff/resources per stage | V2 |
| Parallel stage support | Fork/join patterns | V3 |

### G3: Multi-Tenant & Multi-Branch

**Objective:** Ensure complete tenant isolation with support for unlimited branches per tenant.

| KR | Target | Timeline |
|---|---|---|
| Tenant data isolation | Zero cross-tenant data leakage | MVP |
| Branch-level configuration | Independent services, hours, workflows per branch | MVP |
| Consolidated tenant dashboard | Cross-branch analytics | V2 |
| Branch-level user permissions | Staff see only their branch data | MVP |

### G4: Self-Service Onboarding

**Objective:** Enable a business owner to go from signup to first queue in under 10 minutes.

| KR | Target | Timeline |
|---|---|---|
| Signup → Tenant creation | < 2 minutes | MVP |
| Branch setup wizard | Guided branch creation | MVP |
| Service configuration | Add services in < 1 minute | MVP |
| QR code generation | Auto-generated on branch creation | MVP |
| Queue display URL | Shareable, no-auth display link | MVP |

### G5: Operational Intelligence

**Objective:** Surface actionable insights that help businesses optimize their operations.

| KR | Target | Timeline |
|---|---|---|
| Real-time dashboard | Live queue count, wait times, throughput | V2 |
| Historical analytics | Daily/weekly/monthly trend reports | V2 |
| Staff utilization metrics | Service time per staff member | V3 |
| Peak hour analysis | Identify busy periods with recommendations | V3 |
| Export capabilities | CSV/PDF report export | V3 |

---

## 2. Product Goals by Phase

### Phase 1: Foundation (MVP)

| Goal | Description | Priority |
|---|---|---|
| Authentication | Email/password + Google OAuth | P0 |
| Tenant Management | Create, configure, manage tenants | P0 |
| Branch Management | CRUD branches with operating hours | P0 |
| Service Management | Define services per branch | P0 |
| Basic Queue | Create, call, serve, complete queue items | P0 |
| QR Queue Entry | Customer scans QR → joins queue | P0 |
| Queue Display | Public display page for waiting area screens | P0 |
| RBAC | Owner, Admin, Staff roles | P0 |

### Phase 2: Enhanced Queue (V2)

| Goal | Description | Priority |
|---|---|---|
| Workflow Engine | Configurable multi-step workflows | P0 |
| Multi-Step Queue | Queue items move through workflow stages | P0 |
| Queue Analytics | Wait time, throughput, no-show metrics | P1 |
| Notification System | SMS/Push notifications for queue status | P1 |
| Appointment Booking | Customer self-service booking | P1 |

### Phase 3: Intelligence (V3)

| Goal | Description | Priority |
|---|---|---|
| Advanced Analytics | Staff utilization, peak hours, trends | P1 |
| Appointment + Queue Blending | Merge walk-in and appointment queues | P1 |
| Customer Portal | Customer queue history, rebooking | P2 |
| API / Webhooks | External integrations | P2 |

### Phase 4: Scale (V4+)

| Goal | Description | Priority |
|---|---|---|
| White-Label | Custom branding per tenant | P2 |
| Multi-Language | i18n support | P2 |
| Advanced Workflow | Parallel stages, conditional branching | P2 |
| Marketplace | Third-party plugin ecosystem | P3 |

---

## 3. Quality Goals

| Quality Attribute | Target | Measurement |
|---|---|---|
| **Performance** | Queue creation < 1s, Display refresh < 2s | Lighthouse, custom metrics |
| **Availability** | 99.9% uptime | Firebase monitoring |
| **Security** | Zero cross-tenant data leaks | Security rules testing, penetration testing |
| **Scalability** | Support 1000+ concurrent tenants | Load testing |
| **Usability** | Onboarding < 10 min, first queue < 5 min | User testing |
| **Accessibility** | WCAG 2.1 AA compliance | Axe, Lighthouse |
| **Maintainability** | < 2 hour avg bug fix time | Git metrics |
| **Cost Efficiency** | Firestore cost < $0.10/tenant/month at scale | Firebase billing dashboard |

---

## 4. Anti-Goals

These are things we **explicitly will not do**:

1. **Build a POS system** — We manage flow, not payments
2. **Build a CRM** — We track queue items, not customer relationships
3. **Build a booking marketplace** — We power the business, not aggregate listings
4. **Support offline-first** — Internet is required; graceful degradation only
5. **Build native mobile apps** — PWA approach for mobile; native comes later
6. **Custom domain per tenant** — Not in MVP roadmap
7. **Build our own auth** — Firebase Auth is the identity provider
