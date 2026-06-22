# ServiceOS — Frontend Route & Layout Design

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## 1. Route Structure (React Router)

ServiceOS divides routes into Public (marketing, self-service queue joining, public TV displays) and Protected (dashboards, admin settings, queue control boards).

```
/ (Public Marketing & Landing Page)
├── /login (Login)
├── /signup (Signup & Tenant Creator)
├── /booking/{branchId} (Public Self-Booking calendar)
├── /join/{branchId} (Public QR Queue Join form)
├── /display/{branchId} (Public TV Queue display interface)
├── /status/{queueItemId} (Real-time customer status tracker)
└── /dashboard (Protected Root)
     ├── /dashboard/queues (Queue Management Control Board)
     ├── /dashboard/appointments (Appointment Schedules)
     ├── /dashboard/branches (Branch management)
     ├── /dashboard/services (Services management)
     ├── /dashboard/staff (Staff user invites)
     └── /dashboard/settings (Business profile & custom fields)
```

---

## 2. Layout Structure

The interface uses three primary layout wrappers:

### 2.1 Public Layout (`PublicLayout.tsx`)
- Centered container layout. Simple styling optimized for high speed, low bandwidth mobile browsers. Used by the QR queue check-in form and the status tracker.

### 2.2 Dashboard Layout (`DashboardLayout.tsx`)
- Desktop sidebar + top-bar navigation wrapper. Features collapsable sidebar navigation, breadcrumbs, user profile dropdowns, and live system alert notification badges.

### 2.3 TV Display Layout (`DisplayLayout.tsx`)
- Full-screen, dark-mode-optimized layout designed for TV aspect ratios (16:9). Hides all browser chrome, scrolling bars, and cursor indicators.

---

## 3. Responsive Strategy

ServiceOS implements a **Device-Targeted Responsive Strategy**:

- **Staff Dashboard / Queue Control**: Designed primarily for Desktop and Tablet (landscape). Large text sizes, wide click regions, and card views support fast, fat-finger execution on iPads mounted on cashier counters.
- **Customer QR Interface**: Designed strictly Mobile-First. Widths fit 320px screens, layouts use single columns, and interactions are optimized for touch targets (min 48px size) to avoid zooming.
- **Display Screens**: Optimized for 1080p and 4K TV screens. High-contrast typography and large spacing make information readable from 10 meters away in a waiting area.
