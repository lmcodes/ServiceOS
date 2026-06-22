# ServiceOS — AI Development Rules & Standards

> Version: 1.0 | Last Updated: 2026-06-22 | Target: All AI Coding Agents

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

## 4. Testing Standards

- **Unit Tests**: Implement tests using Vitest/Jest for services and utility helpers.
- **Component Tests**: Test core components using React Testing Library.
- **Firestore Mocking**: When writing repository tests, use the Firebase Security Rules Emulator to validate read/write blocks.
- **Zero Console Errors**: Code contributions must run without console logs, warnings, or unhandled promise rejections.
