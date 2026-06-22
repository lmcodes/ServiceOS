# ServiceOS — Firestore Query Patterns & Indexes

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## 1. Core Query Patterns

To support real-time dashboards, display screens, and patient routing, Firestore queries must execute with minimal latency. This requires precise structuring of queries to leverage indexes.

### QP-01: Get Active Queues for Branch Dashboard (Real-Time)
- **Use Case**: Staff dashboard showing all active queues sorted by wait priority.
- **Query**:
  ```typescript
  firestore()
    .collection('queues')
    .where('branchId', '==', branchId)
    .where('status', 'in', ['WAITING', 'CALLED', 'SERVING'])
    .orderBy('priority', 'desc')
    .orderBy('sequenceNumber', 'asc');
  ```
- **Requirements**: Composite Index on `branchId` + `status` + `priority` + `sequenceNumber`.

### QP-02: Get Waiting List for Public Display
- **Use Case**: TV screens displaying customers waiting to be called.
- **Query**:
  ```typescript
  firestore()
    .collection('queues')
    .where('branchId', '==', branchId)
    .where('status', '==', 'WAITING')
    .orderBy('sequenceNumber', 'asc');
  ```
- **Requirements**: Composite Index on `branchId` + `status` + `sequenceNumber`.

### QP-03: Get Today's Appointments for Branch
- **Use Case**: Reception list of scheduled appointments for the current day.
- **Query**:
  ```typescript
  firestore()
    .collection('appointments')
    .where('branchId', '==', branchId)
    .where('scheduledDate', '==', todayDateString) // "YYYY-MM-DD"
    .orderBy('startTime', 'asc');
  ```
- **Requirements**: Composite Index on `branchId` + `scheduledDate` + `startTime`.

### QP-04: Get Audit Logs for Tenant (Filtered)
- **Use Case**: Management portal auditing actions within a branch.
- **Query**:
  ```typescript
  firestore()
    .collection('auditLogs')
    .where('tenantId', '==', tenantId)
    .where('branchId', '==', branchId)
    .orderBy('timestamp', 'desc')
    .limit(50);
  ```
- **Requirements**: Composite Index on `tenantId` + `branchId` + `timestamp`.

---

## 2. Composite Indexes Configuration (`firestore.indexes.json`)

To enable the queries above, the following composite indexes must be defined in the Firebase configuration:

```json
{
  "indexes": [
    {
      "collectionGroup": "queues",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "branchId", "order": "ASCENDING" },
        { "fieldPath": "status", "arrayConfig": "CONTAINS" },
        { "fieldPath": "priority", "order": "DESCENDING" },
        { "fieldPath": "sequenceNumber", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "queues",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "branchId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "sequenceNumber", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "appointments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "branchId", "order": "ASCENDING" },
        { "fieldPath": "scheduledDate", "order": "ASCENDING" },
        { "fieldPath": "startTime", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "auditLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tenantId", "order": "ASCENDING" },
        { "fieldPath": "branchId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    }
  ]
}
```
