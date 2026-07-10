# ServiceOS — AI Development Rules & Standards

> Version: 1.1 | Last Updated: 2026-07-10 | Target: All AI Coding Agents

This document defines the code patterns, architectural layers, naming conventions, and testing strategies that all AI assistants (Gemini, Claude, GPT, Cursor, Windsurf) must follow when contributing to ServiceOS.

---

## 1. Coding & Naming Standards

### 1.1 TypeScript & React Standards
- Write clean, type-safe TypeScript. Avoid using the `any` keyword.
- Use functional components with arrow syntax: `const MyComponent: React.FC = () => {}`.
- Define prop interfaces explicitly above the component: `interface Props {}`.
- Prefer React hooks over class components. Custom hooks must begin with `use` (e.g. `useQueueQuery.ts`).
- Handle null safety using optional chaining (`?.`) and nullish coalescing (`??`).

### 1.2 Naming Conventions
- **Component files**: PascalCase (e.g. `QueueCard.tsx`).
- **Utility files / custom hooks**: camelCase (e.g. `useBranchStats.ts`, `dateFormatter.ts`).
- **CSS classes**: Tailwind standard classes. Avoid inline styles unless calculating dynamic layout bounds.
- **Firestore collections**: camelCase plural (e.g. `queues`, `appointments`).
- **Enums**: Upper snake case (e.g. `WAITING`, `CALLED`, `SERVING`).
- **Translation keys**: Namespaced dot-notation (e.g. `login.emailLabel`, `pages.queues.title`). Never use flat keys.

---

## 2. Folder Structure Standards

Always adhere to the feature-based folder architecture. Group assets, logic, components, and hooks by feature.

```
src/
├── features/
│   ├── [feature_name]/         # e.g., auth, queues, display
│   │   ├── components/         # Local feature components
│   │   ├── hooks/              # Local React hooks
│   │   ├── services/           # Feature business rules
│   │   ├── repository/         # Local Firestore data mapping
│   │   └── types/              # TypeScript typings
```

---

## 3. Git & Pull Request Standards

### 3.1 Commit Messages
Follow semantic commit formatting:
- `feat(queues): add call next button handler`
- `fix(auth): resolve custom claims refresh sync delay`
- `refactor(db): optimize query indexes for display screen`
- `docs(api): update REST contract documentation`

### 3.2 Pull Requests
- Keep changes focused. Avoid editing files outside the target feature boundary.
- Do not mix dependency additions with feature development.

---

## 4. Internationalization (i18n) Standards

> **ข้อกำหนดบังคับ**: ServiceOS ใช้ **react-i18next** เป็นมาตรฐานเดียวสำหรับ Multi-Language ทั้งระบบ ห้ามสร้าง Custom Context หรือ translation dictionary ทดแทน

### 4.1 Library Stack
- **`react-i18next`** — React integration hooks (`useTranslation`)
- **`i18next`** — Core i18n engine
- **`i18next-browser-languagedetector`** — ตรวจจับภาษาจาก localStorage และ browser

### 4.2 File Structure
```
src/
├── config/
│   └── i18n.ts               # Initialize i18next (import นี้ใน App.tsx)
└── locales/
    ├── th/
    │   └── translation.json  # Thai translations
    └── en/
        └── translation.json  # English translations
```

### 4.3 Key Naming Convention
ใช้ **namespace dot-notation** จัดกลุ่มตาม feature/section:
```json
{
  "common": { "loading": "กำลังโหลด..." },
  "login": { "title": "เข้าสู่ระบบ", "emailLabel": "อีเมล" },
  "pages": {
    "queues": { "title": "บอร์ดควบคุมคิว" }
  }
}
```

### 4.4 Usage Rules

**✅ ถูกต้อง — ใช้ `useTranslation` จาก react-i18next:**
```tsx
import { useTranslation } from 'react-i18next';

const MyComponent: React.FC = () => {
  const { t } = useTranslation();
  return <h1>{t('login.title')}</h1>;
};
```

**✅ ถูกต้อง — สลับภาษาด้วย `i18n.changeLanguage()`:**
```tsx
const { i18n } = useTranslation();
i18n.changeLanguage('en');
```

**✅ ถูกต้อง — Interpolation ด้วย `{{variable}}`:**
```json
{ "peopleAhead": "มีอีก {{count}} คิวก่อนคุณ" }
```
```tsx
t('pages.ticketStatus.peopleAhead', { count: 3 })
```

**❌ ห้ามสร้าง Custom LanguageContext:**
```tsx
// ห้ามทำแบบนี้
const LanguageContext = createContext(...);
export const useTranslation = () => useContext(LanguageContext);
```

**❌ ห้าม Inline ternary:**
```tsx
// ห้ามทำแบบนี้
locale === 'th' ? 'เข้าสู่ระบบ' : 'Sign In'
```

**❌ ห้าม Flat translation object:**
```tsx
// ห้ามสร้าง translations.ts dictionary แบบ flat
export const translations = { th: { loginTitle: '...' } };
```

### 4.5 Adding New Features with Translations
เมื่อสร้าง feature ใหม่ที่มี UI text:
1. เพิ่ม keys ลงใน `src/locales/th/translation.json` ก่อน
2. เพิ่ม keys เดียวกันลงใน `src/locales/en/translation.json`
3. ใช้ `t('namespace.key')` ใน component
4. ห้ามใช้ hardcoded Thai/English string ใน JSX โดยตรง

---

## 5. Testing Standards

- **Unit Tests**: Implement tests using Vitest/Jest for services and utility helpers.
- **Component Tests**: Test core components using React Testing Library.
- **Firestore Mocking**: When writing repository tests, use the Firebase Security Rules Emulator to validate read/write blocks.
- **Zero Console Errors**: Code contributions must run without console logs, warnings, or unhandled promise rejections.
