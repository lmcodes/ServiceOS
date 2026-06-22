# ServiceOS — UI Component & Styling Design

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## 1. UI Component Structure

Following the feature-based structure, components are split into local feature components and global reusable design system tokens.

```
src/
├── components/                 # Global UI Kit (atomic design)
│   ├── Button/
│   ├── Input/
│   ├── Table/
│   ├── Modal/
│   ├── Card/
│   └── Badge/
└── features/
     └── queues/components/     # Feature-specific components
         ├── QueueControlCard/  # Holds "Call Next" control functions
         ├── WaitingListView/   # Current active waitlist cards
         └── CounterSelect/     # Drops to select current staff counter
```

---

## 2. State Management Strategy

To maintain real-time queue states while avoiding unnecessary API reads, ServiceOS implements a hybrid state strategy:

```
                  ┌──────────────────────────────┐
                  │        State Category        │
                  └──────────────┬───────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Global Auth    │    │   Server State   │    │    Local UI      │
│   & Context      │    │  (Queues/Staff)  │    │ (Dropdown open)  │
├──────────────────┤    ├──────────────────┤    ├──────────────────┤
│  React Context   │    │   React Query    │    │    React State   │
│  (Auth, Tenant)  │    │  (Live Sync via  │    │  (useState/useRef)│
│                  │    │  Firestore API)  │    │                  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

- **Global Context**: Used for static, high-frequency properties (e.g. current logged-in user profile, tenant config parameters).
- **Server Cache (React Query)**: Handles all domain query caching. Features:
  - Cache invalidation on mutation events.
  - Integration with Firestore `onSnapshot` inside React Query `useEffect` hooks for real-time synchronization.
- **Local State**: Handled using standard `useState` or `useReducer` for UI state (e.g., active tab selection, search query string inputs).

---

## 3. Design System Tokens (Tailwind CSS)

The UI uses a dark-mode-first, premium interface. The theme tokens are integrated into the CSS configuration:

```javascript
// tailwind.config.js tokens definition
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          500: '#3b82f6', // primary blue accent
          600: '#2563eb',
          900: '#1e3a8a',
        },
        slate: {
          900: '#0f172a', // premium dark background
          800: '#1e293b', // card background
          700: '#334155', // borders
        },
        success: '#10b981', // green for serving/completed
        warning: '#f59e0b', // orange for called
        danger: '#ef4444',  // red for cancelled/no-show
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'], // Premium modern font family
      },
      borderRadius: {
        'glass': '12px',
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
      }
    }
  }
}
```
*Note: A glassmorphic theme style (semi-transparent card backgrounds, background blurs, and thin borders) is used in public TV displays and customer-facing mobile views to provide a premium feel.*
