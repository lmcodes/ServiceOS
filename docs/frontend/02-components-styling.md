# ServiceOS — UI Component & Styling Design

> Version: 1.1 | Last Updated: 2026-07-10 | Status: Active

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

## 3. Internationalization (i18n)

> **ข้อกำหนดบังคับ**: ระบบ Multi-Language ทั้งหมดใช้ **react-i18next** เป็นมาตรฐานเดียว — ดูรายละเอียดใน [AI_DEVELOPMENT_RULES.md § 4](../../AI_DEVELOPMENT_RULES.md)

### โครงสร้างไฟล์

```
src/
├── config/
│   └── i18n.ts               # i18next initialization (import ใน App.tsx)
└── locales/
    ├── th/
    │   └── translation.json  # Thai translations — แบ่ง namespace ตาม feature
    └── en/
        └── translation.json  # English translations
```

### Pattern ที่ใช้ในทุก Component

```tsx
// ✅ ถูกต้อง
import { useTranslation } from 'react-i18next';

const MyPage: React.FC = () => {
  const { t } = useTranslation();
  return <h1>{t('pages.queues.title')}</h1>;
};

// ✅ สลับภาษา
const { i18n } = useTranslation();
i18n.changeLanguage('en'); // persist ใน localStorage โดยอัตโนมัติ

// ✅ Interpolation
t('pages.ticketStatus.peopleAhead', { count: 3, mins: 10 })
// → JSON: { "peopleAhead": "มีอีก {{count}} คิวก่อนคุณ • รอประมาณ {{mins}} นาที" }
```

### Key Namespace Structure

| Namespace | ใช้สำหรับ |
|-----------|----------|
| `common.*` | Shared labels: `loading`, `or`, `errorConnection`, `sending` |
| `validation.*` | Form validation errors |
| `passwordStrength.*` | Password strength labels |
| `auth.*` | Generic auth UI labels |
| `login.*` | Login page specific |
| `signup.*` | Signup page specific |
| `forgotPassword.*` | Forgot password page |
| `onboarding.*` | Onboarding form + business types |
| `dashboard.*` | Sidebar nav, topbar |
| `pages.*` | Mock/skeleton page content per route |

---

## 4. Design System Tokens (Tailwind CSS)

The UI uses a dark-mode-first, premium interface. The theme tokens are integrated into the CSS configuration to support robust contrast and avoid missing values:

```javascript
// tailwind.config.js tokens definition
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#d6e0ff',
          300: '#adc1ff',
          400: '#60a5fa', // bright blue-400 for high-contrast dark mode text/icons
          500: '#3b82f6', // primary blue accent
          600: '#2563eb',
          655: '#1d4ed8', // vibrant primary blue
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#0f172a', // dark brand background
        },
        slate: {
          50: '#f1f5f9',  // light mode layout background (standard slate-100)
          100: '#e2e8f0', // standard slate-200
          200: '#cbd5e1', // light mode card border (standard slate-300)
          300: '#94a3b8', // standard slate-400
          400: '#64748b', // standard slate-500
          500: '#475569', // standard slate-600
          600: '#334155', // standard slate-700
          650: '#475569',
          655: '#475569', // Slate 600
          700: '#2e3b52', // dark mode border
          800: '#1c2536', // dark mode elevated background
          900: '#0e1626', // dark mode card background
          950: '#030712', // deep dark layout background
        },
        emerald: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#10b981',
          550: '#059669',
          600: '#059669',
          650: '#059669',
          655: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        red: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          555: '#dc2626',
          600: '#dc2626',
          650: '#dc2626',
          655: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
          955: '#450a0a',
        },
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          550: '#d97706',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
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
