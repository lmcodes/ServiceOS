# ServiceOS — System Architecture Overview

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## 1. Overall System Architecture

ServiceOS is a modern, serverless multi-tenant platform. It leverages React on the frontend and Firebase on the backend to achieve high scalability, low latency, and operational cost efficiency.

```
                      ┌────────────────────────────────────────┐
                      │            Frontend Client             │
                      │   - React + Vite + TypeScript          │
                      │   - React Query (server cache)         │
                      │   - Tailwind CSS (UI Styling)          │
                      └────────────────────────────────────────┘
                               /                      \
                    Firestore /                        \ Cloud Functions
                     Protocol/                          \ HTTPS / AdminSDK
                            ▼                            ▼
                 ┌────────────────────┐        ┌────────────────────┐
                 │  Cloud Firestore   │◄───────│  Cloud Functions   │
                 │  - Logical tenant  │        │  - Custom Claims   │
                 │    isolation       │        │  - Stripe Webhooks │
                 │  - Real-time sync  │        │  - SMS Dispatcher  │
                 └────────────────────┘        └────────────────────┘
```

---

## 2. Frontend Architecture

The React application uses a **Feature-based Folder Structure**. Instead of grouping by technical type (e.g. all components in one folder, all hooks in another), files are grouped by business capability.

### 2.1 Directory Structure
```
src/
├── assets/             # Global media files
├── components/         # Common UI components (buttons, inputs)
├── config/             # Firebase config and constants
├── context/            # Global contexts (AuthContext, TenantContext)
├── features/           # Feature modules
│   ├── auth/           # Login, signup, password reset
│   ├── branches/       # Branch list, creation, hours settings
│   ├── display/        # Public TV queue display interface
│   ├── queues/         # Waitlist management, calling interface
│   ├── appointments/   # Booking calendars, schedules
│   └── settings/       # Tenant details, custom fields
├── hooks/              # Global reusable hooks
├── layouts/            # Dashboard layouts, public layouts
├── routes/             # App Router mapping (React Router)
├── services/           # Api connection client wrappers
└── utils/              # Helper utilities
```

---

## 3. Backend Architecture

The backend consists entirely of managed Firebase serverless services:

| Component | Technology | Role |
|---|---|---|
| **Identity Management** | Firebase Authentication | Controls user login, credentials, and custom claims injection. |
| **Primary Database** | Cloud Firestore | Real-time database storing tenant, branch, service, and queue data. |
| **Asset Storage** | Firebase Storage | Stores logos, printed QR poster PDFs, and images. |
| **Logic & Integrations** | Cloud Functions | Node.js environment executing background tasks, third-party integrations (Stripe, Twilio), and cron reset jobs. |
| **Hosting** | Firebase Hosting | CDN hosting for the compiled React web application. |
