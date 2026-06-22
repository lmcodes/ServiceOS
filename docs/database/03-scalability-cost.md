# ServiceOS — Firestore Scalability & Cost Analysis

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## 1. Scalability Analysis

Firestore offers massive scale, but exhibits limits when updating single documents repeatedly (max 1 write per second to a single document) or fetching long lists. ServiceOS mitigates these limitations through architectural patterns.

### 1.1 Hotspotting Mitigation (Sharded Counters)
- **Problem**: Daily ticket issuance increments the branch's `currentQueueNumber` field. During peak load (e.g. lunch hour at a busy restaurant), multiple customers scanning QR codes simultaneously can exceed the 1 write/sec limit, causing transaction failures.
- **Solution**:
  - For standard branches: Use transaction blocks to safely increment counters.
  - For extreme-load branches (Enterprise): Implement a **Sharded Counter** model for daily numbers where the count is distributed across 5 independent shards, reducing collision chance by 80%.

### 1.2 Subcollection Partitioning
- **Design Decision**: Storing historical logs inside a branch's subcollection rather than root collections creates issues when deleting tenants or running wide analytical scans. Keeping documents flat under root collections (like `queues` and `auditLogs`) allows Firestore to partition data efficiently without resource limits.

---

## 2. Cost Analysis & Optimization Strategies

Firestore billing is based on:
1. **Reads**: Number of documents fetched by queries or listeners.
2. **Writes**: Number of documents created, updated, or deleted.
3. **Storage**: GB of data retained.

### 2.1 Optimization: Debouncing Real-Time Listeners
- **Issue**: Public displays listen to branch queues in real time. If 10 screens listen to the entire active queues list, every single ticket state change (e.g. status transition) generates $10 \times N$ reads.
- **Optimization**:
  - Limit the query to the minimum fields necessary.
  - Limit the returned list size using `.limit(15)` on public display screens.
  - Cache static configurations (like services metadata) in memory or LocalStorage.

### 2.2 Cost Model Projection (Per 1,000 processed queues)

Assuming a typical single-branch customer flow:
- 1 Queue Item creates:
  - 1 Write (Create QueueItem)
  - 1 Write (Increment Branch Counter)
  - 1 Write (Audit Log entry)
  - 1 Write (Transition to Called)
  - 1 Write (Transition to Completed)
  - **Total Writes per item**: ~5 writes.

- 1 Queue Item reads (by Dashboard, TV Display, and customer mobile):
  - 2 Reads (Dashboard load/reload)
  - 3 Reads (Real-time updates on TV display)
  - 3 Reads (Real-time updates on Customer phone)
  - **Total Reads per item**: ~8 reads.

| Operation | Volume (per 1,000 items) | Unit Cost ($) | Total Cost ($) |
|---|---|---|---|
| Writes | 5,000 | $0.18 / 100,000 | $0.009 |
| Reads | 8,000 | $0.06 / 100,000 | $0.0048 |
| Storage | ~1.5 MB | $0.18 / GB | Negligible |
| **Total** | | | **~$0.0138 per 1,000 tickets** |

At a retail pricing of $29/mo (Starter) or $99/mo (Pro), gross profit margin on database resource costs remains **exceeding 98%**, validating the viability of the serverless Firestore stack.
