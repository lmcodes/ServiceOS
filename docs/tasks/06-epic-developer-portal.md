# Epic: Developer Portal & API Integration

> Version: 1.0 | Last Updated: 2026-07-12 | Status: Completed

---

## 1. Feature: Developer Portal & Public API

### Story: API Access & Outbound Webhook Integrations
*As a developer or system integrator, I want to use API Keys to call REST endpoints externally and register Webhook URLs to receive status update payloads automatically, so that I can integrate ServiceOS with external CRM, ERP, or notification systems.*

- **Task ID**: `DEV-01`
- **Estimated Complexity**: High (8 story points)
- **Dependencies**: `QC-01`, `QC-02`
- **Description**: Frontend developer console and backend endpoints for key authentication, rate limiting, webhook dispatch with signature validation, manual connection testing, and log redelivery.

#### Completed Tasks
- [x] Build `DeveloperPage.tsx` interface for managing API Keys, Webhooks, and Webhook dispatch logs.
- [x] Implement the `api` Cloud Function for public REST endpoints:
  - `POST /api/v1/queues` — Creates a new queue ticket.
  - `GET /api/v1/queues` — Lists queue tickets for a branch.
  - `GET /api/v1/queues/:id` — Retrieves status of a specific ticket.
- [x] Implement sliding window API rate limiting (100 req/min per key) using an in-memory cache to prevent abuse.
- [x] Implement transactional webhook trigger `onQueueItemWriteWebhook` on Firestore queue changes:
  - Signs payload using HMAC SHA-256 (`X-Svcos-Signature`) to guarantee data integrity.
  - Features an exponential backoff loop (up to 3 attempts with 1s and 2s delays) for transient error handling.
- [x] Create connection test (`POST /api/v1/webhooks/:id/test`) and log redelivery (`POST /api/v1/webhook-logs/:id/redeliver`) backend REST endpoints.
- [x] Add repository wrappers for testing and redelivery in `developerRepository.ts`.
- [x] Add **Test Connection (Ping)** and **Redeliver Payload** buttons to the Webhooks and Logs dashboard UI panels with beautiful result dialogues.

#### Acceptance Criteria
- REST API endpoints are secured behind API Keys (header `x-api-key`).
- Outgoing webhooks are cryptographically signed using the endpoint's auto-generated secret key.
- Manual test pings send `ping.test` events and render the resulting status code and response body back to the user.
- Re-triggering a log delivery resends the original payload and records a new log entry.
