# ServiceOS — Architectural Patterns & Layering

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## 1. Clean Architecture Design Patterns

ServiceOS separates concerns on both the client and server through the Repository Pattern and a Service Layer. This isolation ensures components remain unaware of underlying database schemas and query structures, facilitating maintenance and potential database migrations.

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                   │
│         - React Components & custom React Hooks         │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      Service Layer                      │
│     - Orchestrates business rules & state changes       │
│     - e.g. QueueService.callNext(branchId)              │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Repository Layer                     │
│         - Directly interacts with Firestore API         │
│         - e.g. QueueRepository.updateStatus(id, status) │
└─────────────────────────────────────────────────────────┘
```

### 1.1 The Repository Layer
Repositories are responsible for raw data access. They construct Firestore queries, run transaction blocks, and map document states to domain models.
- **Example**: `QueueRepository.ts` exposes methods like `getActiveByBranch(branchId)`, `create(queueItem)`, and `update(id, data)`.

### 1.2 The Service Layer
Services encapsulate business rules. They check permissions, coordinate transaction writes across repositories, and trigger side effects like sending SMS.
- **Example**: `QueueService.ts` contains the logic for `callCustomer(queueItemId, staffId)`. It updates the item's status, logs an audit log entry, and dispatches a notification in a single atomic sequence.

---

## 2. Event-Driven Dispatch System

The system implements a lightweight, reactive event system. Since Firestore is a real-time database, events are published as writes to specific collections, which are processed asynchronously by database triggers.

```
                 [ Action: Complete Queue ]
                             │
                             ▼
              [ Firestore Document Update ]
               (queues/{id}.status = COMPLETE)
                             │
                             ▼
             [ Firestore Cloud Function Trigger ]
                (functions: exports.onQueueComplete)
                             │
                             ▼
                 [ Dispatch Side Effects ]
                   - Update daily metrics
                   - Log audit event
                   - Free resource
```

---

## 3. Error Handling, Logging, and Monitoring

### 3.1 Error Handling Strategy
- **Client**: Custom `AppError` wrapper with human-readable messaging. Top-level React **ErrorBoundary** captures uncaught exceptions and displays a fallback UI.
- **Server**: Cloud Functions use standard HTTP error responses (`FunctionsErrorCode`) for API endpoints. Trigger functions catch and swallow transient errors, retrying up to 3 times before sending to a Dead Letter Queue (DLQ).

### 3.2 Logging
- **Standard Format**: JSON logs are written using `firebase-functions/logger` containing:
  - `timestamp`, `level` (INFO/WARN/ERROR), `tenantId`, `action`, and `errorDetails` (stack trace if ERROR).

### 3.3 Monitoring
- **Firebase Crashlytics / Google Cloud Logging**: Collects uncaught client crashes.
- **Google Cloud Monitoring**: Tracks Cloud Function execution speed, cold start times, memory usage, and Firestore read/write spike metrics.
- **Sentry Integration** (Post-MVP): Real-time application monitoring for frontend clients.
