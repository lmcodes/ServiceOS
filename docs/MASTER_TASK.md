# ServiceOS — Master Task Tracker

> Last Updated: 2026-07-14 | Stack: React + Vite + TypeScript + TailwindCSS + Firebase

---

## สถานะไอคอน
- `[x]` เสร็จแล้ว ✅
- `[/]` กำลังทำ 🔄
- `[ ]` ยังไม่ได้ทำ ⬜
- `[!]` ต้องทดสอบ ⚠️

---

## 📐 PHASE 0 — รากฐานโปรเจกต์ (Foundation)

> เป้าหมาย: ตั้งค่าโครงสร้างโปรเจกต์ให้พร้อมพัฒนา

### P0-01 · Project Scaffolding
- [x] สร้างโปรเจกต์ด้วย Vite + React + TypeScript
- [x] ติดตั้ง dependencies หลัก (react-router-dom, @tanstack/react-query, firebase, zod, lucide-react, date-fns, **react-i18next**, i18next, i18next-browser-languagedetector)
- [x] ตั้งค่า TailwindCSS + PostCSS
- [x] ตั้งค่า ESLint + Prettier
- [x] ตั้งค่า tsconfig.json (path alias `@/` → `src/`)
- [x] สร้างโครงสร้างโฟลเดอร์ `src/` ตาม Feature-Based Architecture
- [x] สร้างไฟล์ `.env` + `.env.example`

**🧪 ทดสอบ:** `npm run dev` → เปิดได้ที่ localhost ไม่มี error

---

### P0-02 · Firebase Setup
- [x] สร้าง Firebase project บน Firebase Console
- [x] เปิดใช้งาน Authentication (Email/Password, Google)
- [x] เปิดใช้งาน Cloud Firestore (Production mode)
- [x] เปิดใช้งาน Cloud Storage
- [x] สร้าง `src/config/firebase.ts` เชื่อมต่อ Firebase SDK
- [x] กำหนดค่า VITE_FIREBASE_* ใน `.env`

**🧪 ทดสอบ:** Import firebase ใน component ไม่มี error console

---

### P0-03 · Core Type System
- [x] สร้าง `src/types/firestore.d.ts` กำหนด interface ครบทุก collection:
  - [x] `Tenant`
  - [x] `Branch`
  - [x] `Service`
  - [x] `QueueItem`
  - [x] `Appointment`
  - [x] `User`
  - [x] `Workflow`, `WorkflowStage`
  - [x] `Subscription`, `AuditLog`

**🧪 ทดสอบ:** `npm run build` TypeScript ไม่มี type error

---

### P0-04 · App Foundation
- [x] สร้าง `src/context/AuthContext.tsx` (onAuthStateChanged + Custom Claims)
- [x] สร้าง `src/context/TenantContext.tsx` (real-time tenant doc listener)
- [x] สร้าง `src/app/App.tsx` (QueryClientProvider + BrowserRouter + Providers)
- [x] สร้าง `src/routes/AppRoutes.tsx` (โครงร่าง routing ทั้งหมด + Mock Pages)
- [x] สร้าง `src/routes/ProtectedRoute.tsx` (guard ตาม role)
- [x] สร้าง Layouts ครบ 4 แบบ:
  - [x] `AuthLayout.tsx` — หน้า Login/Signup
  - [x] `DashboardLayout.tsx` — หน้า Staff Dashboard (sidebar + topbar)
  - [x] `PublicLayout.tsx` — หน้า Public (Join/Status)
  - [x] `DisplayLayout.tsx` — หน้า TV Display

**🧪 ทดสอบ:** นำทางระหว่างหน้าได้ ไม่มี crash | ProtectedRoute redirect ไป /login เมื่อไม่ได้ login

---

## 🔐 PHASE 1 — Authentication & Tenant (Sprint 1)

> เป้าหมาย: ระบบสมัคร/เข้าสู่ระบบ + สร้าง Tenant Workspace

> **🐛 Bug Fixes ที่แก้ไข (2026-07-09):**
> - [x] **`.env` typo**: `VITE_FIREBASE_PROJECT_ID=ervice-os-3c62c` → `service-os-3c62c` (ขาด `s` — ทำให้ Firebase config ผิดทั้งระบบ)
> - [x] **Spinner หมุนไม่หยุด**: `createInitialTenantDoc` ใช้ `await setDoc()` → Firestore rules block → Promise hang → แก้ไขเป็น fire-and-forget (ไม่ await)
> - [x] **Login ไม่ได้**: `AuthLayout` redirect เฉพาะตอนมี `user.role` — user ใหม่ยังไม่มี claims → เพิ่ม redirect ไป `/onboarding` ถ้าไม่มี role
> - [x] **Error handling**: เพิ่ม try/catch รอบ `mutateAsync` ในทุก form component
> 
> > **🐛 Bug Fixes ที่แก้ไข (2026-07-10):**
> > - [x] **Onboarding: No document to update**: ฟังก์ชัน `completeOnboarding` ล้มเหลวหากไม่พบเอกสารของ tenant เก่าหรือเกิดดีเลย์ตอนสร้างบัญชี → ปรับปรุงใช้ `getDoc` เช็คก่อน หากไม่มีให้สร้างใหม่ด้วย `setDoc` พร้อมใส่ค่าเริ่มต้น
> > - [x] **Onboarding: โหลดค้างหน้าเดิมหลังบันทึกสำเร็จ**: เพราะยังไม่มีระบบ Custom Claims (TS-02) ใน Local ทำให้หน้าคิวเด้งกลับไปที่ Onboarding เสมอ → เพิ่ม Development Fallback ใน `AuthContext` ให้ดึงข้อมูลสิทธิ์จาก Firestore โดยตรงเมื่อไม่มีเคลมใน Token

### TS-01 · หน้า Signup & Login (Self-Service Registration)

#### Frontend
- [x] สร้าง `src/features/auth/components/LoginForm.tsx`
  - [x] Input: Email, Password
  - [x] ปุ่ม "Sign in with Google" (Google OAuth)
  - [x] ลิงก์ "Forgot Password"
  - [x] ลิงก์ "Don't have an account? Sign up"
  - [x] Validation ด้วย `zod`
  - [x] จัดการ error state (wrong password, user not found) — Thai error messages
- [x] สร้าง `src/features/auth/components/SignupForm.tsx`
  - [x] Input: Full Name, Email, Password, Confirm Password
  - [x] ปุ่ม "Create Account" + Password Strength Indicator
  - [x] ปุ่ม "Sign up with Google"
  - [x] Validation ด้วย `zod` + confirmPassword match check
- [x] สร้าง `src/features/auth/components/ForgotPasswordForm.tsx`
  - [x] Input: Email
  - [x] เรียก `sendPasswordResetEmail()` + Success state UI
- [x] เชื่อม forms เข้า `AuthLayout` routes (`/login`, `/signup`, `/forgot-password`)

#### Business Logic
- [x] สร้าง `src/features/auth/repository/authRepository.ts`
  - [x] `signInWithEmail(email, password)`
  - [x] `signInWithGoogle()`
  - [x] `signUpWithEmail(name, email, password)`
  - [x] `sendPasswordReset(email)`
  - [x] `logOut()`
- [x] สร้าง Tenant creation helper: เมื่อ signup สำเร็จ → เขียน doc ไปที่ `/tenants/{uid}`
  - [x] fields: `name`, `ownerId`, `email`, `status: 'pending_onboarding'`, `createdAt`
- [x] redirect หลัง signup → `/onboarding` (กรอก tenant profile)

#### Hooks
- [x] สร้าง `src/features/auth/hooks/useLogin.ts` (useMutation wrapper)
- [x] สร้าง `src/features/auth/hooks/useSignup.ts` (useMutation wrapper)

**🧪 ทดสอบ:**
1. สมัครด้วย email ใหม่ → ได้รับ Firebase Auth entry + Firestore `/tenants/{uid}` doc
2. Login ด้วย email ที่สมัครไว้ → redirect ไป `/dashboard`
3. Login ผิด password → แสดง error message
4. กด Forgot Password → รับ email จริง

---

### TS-01b · Onboarding Form (Tenant Profile Setup)
- [x] สร้าง route `/onboarding`
- [x] สร้าง `src/features/auth/components/OnboardingForm.tsx`
  - [x] Input: Business Name, Business Type (dropdown), Phone, Timezone
  - [x] อัปเดต `/tenants/{uid}` doc
  - [x] redirect → `/dashboard` เมื่อสำเร็จ

**🧪 ทดสอบ:** หลัง signup ครั้งแรก → กรอก business name → redirect dashboard → ข้อมูลปรากฏใน Firestore

---

### TS-01c · Multi-Language and Theme Setup (Sprint 1 Addon)
- [x] ตั้งค่า class-based dark mode ใน `tailwind.config.js`
- [x] ติดตั้ง `react-i18next`, `i18next`, `i18next-browser-languagedetector`
- [x] สร้าง `src/config/i18n.ts` — initialize i18next + LanguageDetector (persist ใน localStorage key: `locale`)
- [x] สร้าง `src/locales/th/translation.json` และ `src/locales/en/translation.json` แบบ namespace dot-notation
- [x] สร้าง `src/context/ThemeContext.tsx` — dark/light mode toggle
- [x] สร้าง `SettingsSwitcher.tsx` — ใช้ `i18n.changeLanguage()` สลับภาษา
- [x] อัปเดต `AuthLayout.tsx`, `DashboardLayout.tsx`, `PublicLayout.tsx`, `DisplayLayout.tsx` ให้ใช้ `useTranslation` จาก react-i18next
- [x] Refactor `LoginForm.tsx`, `SignupForm.tsx`, `ForgotPasswordForm.tsx`, `OnboardingForm.tsx` — ลบ inline ternary ออกทั้งหมด ใช้ `t('namespace.key')` แทน
- [x] Refactor Mock Skeleton Pages ใน `AppRoutes.tsx` ใช้ i18next interpolation `{{var}}`
- [x] ลบ `src/context/LanguageContext.tsx` และ `src/shared/translations.ts` ออกจาก codebase

**🧪 ทดสอบ:**
1. เข้าหน้า Login/Signup/Dashboard/Public/Display → สลับภาษา TH/EN ได้ทันที
2. Reload หน้า → ภาษาและธีมที่เลือกยังคงอยู่ (persist ใน localStorage)
3. ไม่มี `locale === 'th' ? '...' : '...'` เหลืออยู่ในโค้ด
4. `useTranslation` import มาจาก `react-i18next` ทุกไฟล์

---

### TS-02 · RBAC — Role-Based Access Control

#### Cloud Functions (Firebase Functions)
- [x] ตั้งค่า Firebase Cloud Functions project (`functions/` folder)
- [x] สร้าง function `onUserCreated` (trigger: `auth.user().onCreate`)
  - [x] inject custom claims: `{ tenantId, role: 'owner', branchIds: [] }`
  - [x] เรียก `admin.auth().setCustomUserClaims(uid, claims)`
- [x] สร้าง Callable function `setUserRole` (เปลี่ยน role/branchIds)
- [x] Deploy/Emulate functions ไปยัง Firebase

#### Frontend
- [x] `ProtectedRoute` ใช้ claims จาก `AuthContext` ตรวจสอบ role ก่อน render
- [ ] `DashboardLayout` ซ่อน/แสดง nav items ตาม role:
  - `staff`: เห็นแค่ Queues
  - `manager`: เห็น Queues + Branches
  - `admin`: เห็นทุกอย่างยกเว้น Settings
  - `owner`: เห็นทุกอย่าง

**🧪 ทดสอบ:**
1. สมัคร user ใหม่ → รอ ~5 วินาที → refresh token → role = 'owner' ปรากฏใน claims
2. Login ด้วย staff account → ไม่เห็น Settings, Services nav items
3. เข้า URL `/dashboard/settings` โดยตรงเมื่อเป็น staff → redirect ไป `/dashboard/queues`

---

## 🏢 PHASE 2 — Branch & Services (Sprint 2)

> เป้าหมาย: Owner/Admin ตั้งค่าสาขาและบริการได้

### QC-01a · Branch Management

#### Repository
- [x] สร้าง `src/features/branches/repository/branchRepository.ts`
  - [x] `getBranches(tenantId)` — real-time listener
  - [x] `createBranch(tenantId, data)`
  - [x] `updateBranch(branchId, data)`
  - [x] `deleteBranch(branchId)` (soft delete: status → 'inactive')
  - [x] เพิ่ม Firestore Security Rules สำหรับ `/branches`

#### Hooks
- [x] `src/features/branches/hooks/useBranches.ts` (useQuery/useRealtime)
- [x] `src/features/branches/hooks/useCreateBranch.ts` (useMutation)
- [x] `src/features/branches/hooks/useUpdateBranch.ts` (useMutation)

#### Components & Pages
- [x] `BranchListPage.tsx` — แสดง branch cards, ปุ่ม "Add Branch"
- [x] `BranchForm.tsx` — Modal/Drawer form:
  - [x] Input: Name, Code, Address, Phone, Email
  - [x] Operating Hours picker (วัน + open/close time)
  - [x] Timezone dropdown
  - [x] Validation ด้วย `zod`
- [x] เชื่อมกับ `/dashboard/branches` route

**🧪 ทดสอบ:**
1. สร้าง branch ใหม่ → ปรากฏในรายการ + Firestore
2. แก้ไข operating hours → บันทึกสำเร็จ
3. Staff account เข้าหน้า Branches → redirect (403)

---

### QC-01b · Service Management

#### Repository
- [x] สร้าง `src/features/services/repository/serviceRepository.ts`
  - [x] `getServices(branchId)` — real-time listener
  - [x] `createService(branchId, data)`
  - [x] `updateService(serviceId, data)`
  - [x] `toggleServiceActive(serviceId, isActive)`

#### Components & Pages
- [x] `ServiceListPage.tsx` — ตาราง services per branch, toggle Active/Inactive
- [x] `ServiceForm.tsx` — Modal form:
  - [x] Input: Name, Description, Category, Estimated Duration (นาที)
  - [x] Max Concurrent, Requires Resource toggle
  - [x] Custom Fields builder (เพิ่ม/ลบ field แบบ dynamic)
  - [x] Validation ด้วย `zod`
- [x] เชื่อมกับ `/dashboard/services` route

**🧪 ทดสอบ:**
1. สร้าง service "General Consultation" duration 15 นาที → ปรากฏในรายการ
2. เพิ่ม custom field "ID Card Number" (required) → บันทึกสำเร็จ
3. Toggle inactive → หายจากหน้า QR Join

---

### QC-01c · QR Code Generation
- [x] ติดตั้ง library generate QR (เช่น `qrcode.react`)
- [x] สร้าง `QRPosterModal.tsx` — แสดง QR code ของ branch
  - [x] URL format: `https://[domain]/join/{branchId}`
  - [x] ปุ่ม "Download QR" (export เป็น PNG)
  - [x] ปุ่ม "Print Poster"
- [x] เพิ่มปุ่ม "QR Code" ในหน้า Branch detail

**🧪 ทดสอบ:**
1. กด "QR Code" → Modal โชว์ QR image
2. Scan QR ด้วยมือถือ → เปิดหน้า `/join/{branchId}` ได้

---

## 🎟️ PHASE 3 — Customer Queue & Staff Console (Sprint 3)

> เป้าหมาย: ลูกค้าเข้าคิวผ่าน QR + Staff เรียกคิวได้

### QC-02 · Customer QR Self Check-In

#### Repository
- [x] สร้าง `src/features/queues/repository/queueRepository.ts`
  - [x] `createQueueItem(branchId, serviceId, customerData)` — Firestore transaction increment counter
  - [x] `getQueueItemById(ticketId)` — real-time listener
  - [x] `cancelQueueItem(ticketId)`

#### Components & Pages
- [x] `JoinPage.tsx` (`/join/:branchId`) — Public page:
  - [x] ดึง branch info + active services
  - [x] แสดง service selector cards
  - [x] Form: Customer Name (required), Phone (optional)
  - [x] Custom Fields ตาม service config
  - [x] Firestore transaction: increment `currentQueueNumber` → สร้าง `QueueItem` status `WAITING`
  - [x] redirect → `/status/{ticketId}`
- [x] `TicketStatusPage.tsx` (`/status/:ticketId`) — Public page:
  - [x] real-time listener แสดงเลขคิว (e.g. "A-042")
  - [x] แสดงจำนวนคนที่รออยู่หน้า + estimated wait time
  - [x] ปุ่ม "Cancel Ticket"
  - [x] แสดง status badge (WAITING / CALLED / SERVING / COMPLETED)
  - [x] เล่น sound alert เมื่อ status เปลี่ยนเป็น CALLED

**🧪 ทดสอบ:**
1. Scan QR → เลือก service → กรอกชื่อ → ได้เลขคิว A-001
2. คนที่ 2 join → ได้ A-002, หน้า status แสดง "1 person ahead"
3. Staff call ticket → หน้า status ของลูกค้า update เป็น CALLED ภายใน 2 วินาที
4. กด Cancel → status เป็น CANCELLED + ไม่ปรากฏใน staff console

---

### QC-03 · Staff Queue Control Console

#### Repository (เพิ่มใน queueRepository)
- [x] `getActiveQueueItems(branchId)` — real-time listener (status ≠ COMPLETED/CANCELLED)
- [x] `callNextTicket(branchId, staffUserId)` — transaction: oldest WAITING → CALLED
- [x] `startServingTicket(ticketId, staffUserId)` — CALLED → SERVING
- [x] `completeTicket(ticketId)` — SERVING → COMPLETED + log audit
- [x] `markNoShow(ticketId)` — CALLED → NO_SHOW + log audit
- [x] `recallTicket(ticketId)` — re-call CALLED ticket

#### Hooks
- [x] `useActiveQueue(branchId)` — real-time subscription
- [x] `useQueueActions()` — mutation wrappers

#### Components & Pages
- [x] `QueueConsolePage.tsx` (`/dashboard/queues`):
  - [x] Header cards: Waiting / Serving / Completed (today)
  - [x] ปุ่ม "Call Next Ticket" (ใหญ่, prominent)
  - [x] Real-time list: แสดง ticket cards แบ่งตาม status
  - [x] Ticket Card component:
    - [x] เลขคิว, ชื่อ, service name, เวลารอ
    - [x] Action buttons: Start / Complete / No-Show / Re-call
  - [x] Filter tabs: All / Waiting / Serving / Completed
  - [x] Branch selector (ถ้า staff มีหลาย branch)

**🧪 ทดสอบ:**
1. กด "Call Next" → ticket แรกสุดเปลี่ยนเป็น CALLED + ปรากฏบน TV Display
2. กด "Start Serving" → SERVING, timer เริ่มนับ
3. กด "Complete" → ออกจาก active list + daily counter เพิ่ม
4. กด "No Show" → NO_SHOW status, audit log ถูก write
5. กด "Re-call" → แสดง notification อีกครั้ง

---

## 📺 PHASE 4 — TV Display & Testing (Sprint 4)

> เป้าหมาย: หน้าจอ TV แสดง real-time + Deploy ครั้งแรก

### TV-01 · Public Display Screen

#### Repository
- [x] `getDisplayData(branchId)` — real-time listener (CALLED + WAITING list)

#### Components & Pages
- [x] `DisplayPage.tsx` (`/display/:branchId`):
  - [x] Layout 2 columns: "Now Calling" (ใหญ่) + "Waiting List"
  - [x] "Now Calling" box: เลขคิว flash animation + เสียง ding
  - [x] "Waiting List": แสดง ticket ที่รอต่อไป (max 8 รายการ)
  - [x] Footer: ชื่อสาขา + เวลา real-time clock
  - [x] รองรับ Full Screen (ปุ่ม fullscreen หรือ auto on load)
  - [x] ดึง branch info แสดงชื่อสาขา + logo

**🧪 ทดสอบ:**
1. เปิดหน้า `/display/{branchId}` บน TV browser
2. Staff กด "Call Next" → เลขคิวปรากฏบน TV ภายใน 1-2 วินาที
3. เสียง ding ดังเมื่อมีการเรียกใหม่
4. หน้า fit พอดี 1080p

---

### TV-02 · Staff Management (Invite Staff)
- [x] `StaffListPage.tsx` (`/dashboard/staff`):
  - [x] ตาราง staff members: ชื่อ, Email, Role, Branch assignments
  - [x] ปุ่ม "Invite Staff" → Modal form (email, role, branch assignment)
- [x] `inviteStaffRepository.ts`:
  - [x] สร้าง `/users/{uid}` doc กับ status `invited`
  - [x] เรียก Cloud Function เพื่อ set custom claims
  - [x] ส่ง invite email (Firebase Email Link หรือ Cloud Function)
- [x] ปุ่ม "Edit Role" + "Deactivate"

**🧪 ทดสอบ:**
1. กด "Invite" ใส่ email → รับ invite email
2. เปิด link → set password → login → dashboard แสดงตาม role ที่กำหนด
3. Owner เปลี่ยน role staff → claims update ภายใน 1 นาที

---

### DEPLOY-01 · MVP Deployment
- [ ] ตั้งค่า Firestore Security Rules ครบทุก collection (`firestore.rules`)
- [ ] ตรวจสอบ `.env` production values
- [ ] `npm run build` → ไม่มี TypeScript error
- [ ] `firebase deploy --only hosting` → deploy สำเร็จ
- [ ] ทดสอบ end-to-end บน production URL:
  - [ ] Signup → Onboarding → Create Branch → Create Service → Generate QR
  - [ ] Customer scan QR → Join queue → Get ticket number
  - [ ] Staff login → Open console → Call Next → Complete
  - [ ] TV Display shows real-time updates

**🧪 End-to-End Test Script (10 วัน):**
- วันที่ 1-3: ทดสอบ Auth flow ทุก role
- วันที่ 4-5: ทดสอบ Branch/Service CRUD
- วันที่ 6-7: ทดสอบ Queue flow ตั้งแต่ QR จนจบ
- วันที่ 8-9: ทดสอบ TV Display + Edge cases (no-show, cancel)
- วันที่ 10: Load test + Security rules audit

---

## ⚙️ PHASE 5 — Settings & Tenant Profile

### SET-01 · Tenant Settings Page
- [x] `SettingsPage.tsx` (`/dashboard/settings`) — owner only:
  - [x] แก้ไข Business Name, Logo (upload to Storage), Timezone
  - [x] Subscription info section (plan, usage)
  - [x] Danger Zone: "Cancel Subscription"
- [x] `uploadLogo()` → Firebase Storage + อัปเดต `/tenants/{id}` doc

**🧪 ทดสอบ:** Upload logo → ปรากฏใน Dashboard sidebar

---

## 🔄 PHASE 6 — V2: Multi-Step Workflow Engine

> เป้าหมาย: รองรับบริการแบบหลายขั้นตอน เช่น คลินิก (ตรวจ → พบแพทย์ → จ่ายยา)

### WF-01 · Workflow Template Builder
- [x] สร้าง `workflows` collection + Firestore schema
- [x] `WorkflowBuilderPage.tsx` ใน branch settings:
  - [x] สร้าง/แก้ไข workflow template
  - [x] เพิ่ม/ลบ/เรียงลำดับ stages
  - [x] กำหนด transition rules ต่อ stage
  - [x] รองรับสองภาษา (i18n Localization TH/EN) ครบทุกฟิลด์การตั้งค่าและเงื่อนไข
- [x] เชื่อม Service กับ Workflow template (workflowId field)

### WF-02 · Multi-Stage Queue Operations
- [x] แก้ไข `QueueItem` เพิ่ม `currentStageId`, `workflowHistory[]`
- [x] Transactional transitions directly in `queueRepository.ts` for safety and performance
- [x] Staff console filter by current stage
- [x] Action buttons: "Advance to Next Stage"

**🧪 ทดสอบ:** สร้าง 2-stage workflow → ticket ผ่าน Stage 1 → Staff advance → ticket ปรากฏใน Stage 2 queue

---

## 📅 PHASE 7 — V3: Appointment Scheduler

### AP-01 · Customer Booking Calendar
- [x] Public route `/booking/:branchId`
- [x] Calendar component (date picker + time slot grid)
- [x] Atomic transactions capacity check-in (แทน Cloud Functions เพื่อประสิทธิภาพสูงสุด)
- [x] Booking form: ชื่อ, email, phone
- [x] สร้าง `/appointments` doc status `CONFIRMED`

### AP-02 · Appointment Check-In
- [x] `AppointmentsPage.tsx` (`/dashboard/appointments`):
  - [x] ตารางนัดหมายและ dashboard สำหรับสตาฟ
  - [x] ปุ่ม "Check In" → update status → สร้าง `QueueItem` priority 5
  - [x] ยกเลิก/ระบุ No-show สำหรับนัดหมาย

**🧪 ทดสอบ:** จอง appointment ผ่าน booking page → ไปที่หน้า Appointments Dashboard → กด Check-in → ตั๋วคิวเข้าสู่คิวหลักโดยอัตโนมัติด้วย priority: 5 (คิวเร่งด่วน)

---

## 💳 PHASE 8 — V4: Analytics & Billing

### ANL-01 · Analytics Dashboard
- [x] `AnalyticsPage.tsx` — owner/admin only:
  - [x] กราฟ daily queue volume (7/30 วัน)
  - [x] Average wait time trends
  - [x] Busiest hours heatmap
  - [x] Per-service breakdown
- [x] อ่านข้อมูลจาก `dailyMetrics` sub-collection

### BILL-01 · Stripe Integration
- [x] ติดตั้ง Stripe SDK ใน Cloud Functions
- [x] สร้าง Cloud Function `createCheckoutSession`
- [x] Cloud Function `stripeWebhook` — handle subscription events
- [x] `SubscriptionPage.tsx` — แสดง plan, ปุ่ม Upgrade, Billing Portal link

---

## 🔌 PHASE 9 — V5: Developer Portal

### DEV-01 · API & Webhooks
- [x] `DeveloperPage.tsx` — generate API tokens
- [x] Cloud Functions: Public REST API endpoints
- [x] Webhook system — fire on queue status changes

---

## 📊 Progress Summary

| Phase | ชื่อ | สถานะ | ความคืบหน้า |
|---|---|---|---|
| 0 | Foundation | ✅ เสร็จแล้ว | 100% |
| 1 | Auth & Tenant | ✅ เสร็จแล้ว | 100% (TS-01 ✅, TS-01b ✅, TS-01c ✅, TS-02 ✅) |
| 2 | Branch & Services | ✅ เสร็จแล้ว | 100% |
| 3 | Queue & Staff Console | ✅ เสร็จแล้ว | 100% |
| 4 | TV Display & Deploy | ✅ เสร็จแล้ว | 100% |
| 5 | Settings | ✅ เสร็จแล้ว | 100% |
| 6 | V2 Workflow Engine | ✅ เสร็จแล้ว | 100% |
| 7 | V3 Appointments | ✅ เสร็จแล้ว | 100% |
| 8 | V4 Analytics & Billing | ✅ เสร็จแล้ว | 100% |
| 9 | V5 Developer Portal | ✅ เสร็จแล้ว | 100% |
| 10 | V6: Queue Range System | ✅ เสร็จแล้ว | 100% |
| 11 | V7 Sub-Service & Workflow Templates | ⬜ ยังไม่เริ่ม | 0% |
| 12 | V8 Counter Groups, VIP Priority & One-Stop | ⬜ ยังไม่เริ่ม | 0% |
| 13 | V9 Kiosk Terminal & Static QR | ⬜ ยังไม่เริ่ม | 0% |
| 14 | V10 Display Media & Templates | ⬜ ยังไม่เริ่ม | 0% |
| 15 | V11 TTS Voice Announcement | ⬜ ยังไม่เริ่ม | 0% |
| 16 | V12 LINE Messaging API Notification | ⬜ ยังไม่เริ่ม | 0% |
| 17 | V13 Web Push Notifications + Service Worker | ⬜ ยังไม่เริ่ม | 0% |

---

## 🗂️ ลำดับงานที่แนะนำสำหรับ AI Codegen (Phase 10–15)

```
Step 18: QR-01~03  → Queue Range System
Step 19: SS-01~03  → Sub-Service & Workflow Step Templates
Step 20: CG-01~04  → Counter Groups, VIP Priority, One-Stop
Step 21: KI-01~02  → Kiosk Terminal & Static QR
Step 22: DM-01~03  → Display Media & Templates
Step 23: TTS-01~03 → TTS Voice Announcement
Step 24: LN-01~04  → LINE Messaging API Queue Notification
Step 25: WP-01~04  → Web Push Notifications + Service Worker
```

---

## 🔢 PHASE 10 — V6: Queue Range System ✅

> เป้าหมาย: แต่ละบริการมีช่วงเลขคิวเป็นของตัวเอง ไม่ผูกกับสาขา

### QR-01 · Queue Range Data Model
- [x] เพิ่ม collection `queueRanges` (tenant-level, แยกจาก branch/service):
  - [x] fields: `id`, `tenantId`, `name`, `prefix`, `startNumber`, `endNumber`, `padLength`, `resetPolicy` (`daily`/`manual`/`never`), `createdAt`
- [x] อัปเดต `Service` type: เพิ่ม `queueRangeId?: string`
- [x] Firestore Security Rules สำหรับ `queueRanges`

### QR-02 · Queue Range Management UI
- [x] `QueueRangePage.tsx` (`/dashboard/queue-ranges`): ตาราง ranges + ปุ่มสร้าง
- [x] Register route `/dashboard/queue-ranges` ใน `AppRoutes.tsx`
- [x] เพิ่ม "Queue Ranges" ใน sidebar `DashboardLayout.tsx`
- [x] `QueueRangeForm.tsx` (Modal):
  - [x] Input: ชื่อ, Prefix (e.g. `A`), Start, End, Pad Length, Reset Policy
  - [x] Preview live: เช่น `A-001` … `A-099`
  - [x] Preset templates: คลินิก (`A-001~A-099`), ร้านอาหาร (`001~199`), ธนาคาร (`B-001~B-299`)
  - [x] Validation ด้วย `zod` (start < end, prefix max 3 chars)

### QR-03 · เชื่อม Queue Range กับ Service
- [x] `ServiceForm.tsx`: dropdown "เลือก Queue Range" จาก tenant ranges
- [x] `ServiceListPage.tsx`: subscribe tenant `queueRanges` และส่งไปยัง `ServiceForm`
- [x] `serviceRepository.ts`: บันทึก/อัปเดต `queueRangeId` ลง Firestore
- [x] `queueRepository.ts`: `createQueueItem` ใช้ `queueRangeId` → increment range counter (Firestore transaction)
- [ ] Cloud Function scheduler: reset counter ตาม `resetPolicy` (daily = ตี 0) _(เหลือสำหรับ Phase ถัดไป)_
- [x] แสดง error "คิวเต็ม" เมื่อถึง endNumber (`QUEUE_FULL` error code)

**🧪 ทดสอบ:**
1. Range "A-Series" prefix=A start=1 end=99 → บริการ A ออก `A-001`
2. Range "B-Series" → บริการ B ออก `B-001` แยกอิสระ
3. ถึง end=99 → แสดง error "คิวเต็ม"
4. Daily reset → ตี 0 counter กลับเป็น start

> **สถานะ:** ✅ Core integration สมบูรณ์แล้ว (Client-side). Cloud Function auto-reset (daily cron) ยังเหลือเป็น Phase ถัดไป

---

## 🧩 PHASE 11 — V7: Sub-Service & Workflow Step Templates

> **สถานะ:** ✅ เสร็จสมบูรณ์ (2026-07-14)

> เป้าหมาย: Workflow step เลือกจาก Sub-Services ที่สร้างไว้ล่วงหน้า + preset ตามประเภทธุรกิจ

### SS-01 · Sub-Service Data Model
- [x] เพิ่ม collection `subServices` (tenant-level):
  - [x] fields: `id`, `tenantId`, `name` (TH+EN), `icon`, `estimatedMinutes`, `category`, `createdAt`
- [x] Firestore Security Rules สำหรับ `subServices`

### SS-02 · Sub-Service Management UI
- [x] `SubServicePage.tsx` (`/dashboard/sub-services`): grid + ปุ่มเพิ่ม
- [x] `SubServiceForm.tsx` (Modal):
  - [x] Input: ชื่อ TH + EN, Icon picker, เวลาโดยประมาณ
  - [x] ปุ่ม "โหลด Preset" ตาม business type ของ tenant:
    - `clinic` → ตรวจสอบสิทธิ์, คัดกรอง, พบแพทย์, ชำระเงิน, จ่ายยา
    - `restaurant` → ลงทะเบียน, รอโต๊ะ, สั่งอาหาร, รับอาหาร, ชำระเงิน
    - `bank` → รับคิว, ดำเนินการ, ตรวจสอบ, ชำระ/เบิกถอน
    - `general` → รับคิว, รอ, บริการ, เสร็จสิ้น

### SS-03 · Workflow Builder อัปเดต
- [x] `WorkflowBuilderPage.tsx`: "เพิ่ม Stage" → popup เลือกจาก Sub-Services ที่มีอยู่
- [x] ยังสร้าง Stage แบบ custom ได้ (ไม่ต้องผูก sub-service)
- [x] อัปเดต `WorkflowStage` type: เพิ่ม `subServiceId?: string`
- [x] แสดง icon + ชื่อ + เวลา จาก sub-service

**🧪 ทดสอบ:**
1. Tenant clinic → กด "โหลด Preset" → ได้ 5 steps อัตโนมัติ
2. ลากเรียงลำดับ steps ได้
3. เพิ่ม step custom ที่ไม่อยู่ใน preset ได้

---

## 🏷️ PHASE 12 — V8: Counter Groups, VIP Priority & One-Stop

> เป้าหมาย: Counter รับหลายบริการ, VIP time-based priority, One-Stop service

### CG-01 · Counter Data Model
- [x] เพิ่ม collection `counters` (branch-level):
  - [x] fields: `id`, `branchId`, `name`, `primaryServiceIds[]`, `secondaryServiceIds[]`, `oneStopServiceIds[]`, `isActive`
- [x] อัปเดต `Counter` type ใน `firestore.d.ts`

### CG-02 · Counter Management UI
- [x] `CounterManagePage.tsx` (`/dashboard/counters`): ตาราง + ปุ่มเพิ่ม
- [x] `CounterForm.tsx` (Modal):
  - [x] Input: ชื่อ Counter (เช่น "เค้าเตอร์ A", "โต๊ะ 2 คน", "โต๊ะ 4 คน")
  - [x] Primary Services: multi-select (งานหลัก)
  - [x] Secondary Services: multi-select (ช่วยงานรองเมื่อว่าง)
  - [x] One-Stop Services: multi-select (ใครมาก่อนได้ก่อน ไม่แยกคิว)

### CG-03 · VIP Customer Priority System
- [x] เพิ่ม collection `customerGroups` (tenant-level):
  - [x] fields: `id`, `tenantId`, `name`, `priorityLevel` (1=ปกติ, 2–10=VIP), `timeMin` (นาที), `timeMax` (นาที), `color`, `badge`
  - [x] default: ทุกคน `priorityLevel: 1`
- [x] `CustomerGroupPage.tsx` (`/dashboard/customer-groups`): ตาราง + ปุ่มเพิ่ม
- [x] `CustomerGroupForm.tsx` (Modal): ชื่อ, level, timeMin, timeMax, สี
- [x] Logic:
  - `elapsed < timeMin` → เข้าคิวปกติ (เหมือนคิวทั่วไป)
  - `timeMin ≤ elapsed < timeMax` → highlight สีในรายการคิวปกติ (เตือน)
  - `elapsed ≥ timeMax` → แทรกคิวทันที (priority สูงสุด)
- [x] อัปเดต `QueueItem`: เพิ่ม `customerGroupId?`, `priorityLevel`, `joinedAt`
- [x] `queueRepository.ts`: `callNextTicket` คำนวณ effective priority จาก elapsed time + level

### CG-04 · Staff Console อัปเดต
- [x] Dropdown "Counter/Station" filter งานที่รับผิดชอบ
- [x] Badge VIP บน ticket cards พร้อมสีตาม group
- [x] Highlight เมื่ออยู่ใน timeMin~timeMax window
- [x] "Call Next" เรียง: VIP overtime > VIP warning > normal (FIFO)

**🧪 ทดสอบ:**
1. Counter "เปิดบัญชี" → Call Next → ดึงคิวเปิดบัญชีก่อน
2. ไม่มีคิวหลัก → ดึง secondary (ถอนเงิน) อัตโนมัติ
3. VIP timeMax=10 นาที → หลัง 10 นาที แทรกแถวทันที
4. One-Stop: ฝาก+ถอน+จ่ายบิล เรียงตาม joinedAt

---

## 📟 PHASE 13 — V9: Kiosk Terminal & Static QR

> เป้าหมาย: หน้าจอ Kiosk ที่สาขา + QR สติกเกอร์แบบถาวร

### KI-01 · Kiosk Terminal Page
- [x] สร้าง route `/kiosk/:branchId` (Public, FullScreen)
- [x] `KioskPage.tsx`:
  - [x] ปุ่มบริการขนาดใหญ่ (ดึงจาก active services)
  - [x] กดปุ่ม → ออกคิวทันที (ไม่ต้องกรอก)
  - [x] ถ้า service มี `requireName: true` → soft keyboard กรอกชื่อ-นามสกุล (ไม่บังคับ)
  - [x] แสดงเลขคิวบน Modal ขนาดใหญ่ + ปุ่ม Print slip (Browser Print API)
  - [x] Auto-reset หน้าจอหลัง idle timeout (default 30 วิ, config ได้)
- [x] `KioskSettingsPage.tsx` (dashboard):
  - [x] เลือก services ที่แสดง, idle timeout, ธีมสี, logo
  - [x] Generate URL + QR สำหรับ Kiosk mode

### KI-02 · Static QR (สติกเกอร์หน้าร้าน)
- [x] `StaticQRPage.tsx` (`/dashboard/static-qr`):
  - [x] เลือก service → Generate QR
  - [x] URL: `/join/:branchId?service=:serviceId&autoJoin=true`
  - [x] Preview โปสเตอร์ A4 / สติกเกอร์ขนาดต่างๆ
  - [x] ดาวน์โหลด PNG / Print PDF
- [x] `JoinPage.tsx` อัปเดต: รับ `?autoJoin=true&service=xxx` → ออกคิวทันที
- [x] ถ้า `requireName: true` → แสดงฟอร์มชื่อ (ไม่บังคับ) ก่อนออกคิว

**🧪 ทดสอบ:**
1. Kiosk URL บน tablet → เห็นปุ่มบริการขนาดใหญ่
2. กด "พบแพทย์" → กรอกชื่อ (optional) → ออกคิว → แสดงเลขคิว
3. Scan Static QR → ออกคิวทันทีโดยไม่เลือก service
4. Idle 30 วิ → กลับหน้าหลักอัตโนมัติ

---

## 🎬 PHASE 14 — V10: Display Media & Templates

> เป้าหมาย: TV Display แสดงสื่อ (รูป/วิดีโอ) สลับกับเลขคิว ตาม template

### DM-01 · Media Library
- [x] เพิ่ม collection `mediaLibrary` (tenant-level):
  - [x] fields: `id`, `tenantId`, `name`, `type` (`image`/`video`/`url`), `storageUrl`, `duration` (วินาที)
- [x] `MediaLibraryPage.tsx` (`/dashboard/media-library`):
  - [x] Grid แสดง media + ปุ่ม Upload
  - [x] รองรับ รูปภาพ, วิดีโอ (Firebase Storage), URL/YouTube embed

### DM-02 · Display Template System
- [x] เพิ่ม collection `displayTemplates` (branch-level):
  - [x] fields: `id`, `branchId`, `name`, `layout`, `mediaPlaylist[]`, `queuePosition`, `transitionSeconds`
  - [x] layouts: `queue-only` / `split-media` (60/40) / `fullscreen-media-with-ticker`
- [x] `DisplayTemplatePage.tsx` (`/dashboard/display-templates`):
  - [x] Preset layout cards พร้อม preview
  - [x] Playlist builder: เพิ่ม/เรียง media + กำหนดเวลาแต่ละชิ้น
  - [x] บันทึก + ตั้งเป็น active template

### DM-03 · DisplayPage อัปเดต
- [x] อ่าน active `displayTemplate` (real-time) → render ตาม layout
  - [x] `queue-only` → เหมือนเดิม
  - [x] `split-media` → media ซ้าย, คิวขวา
  - [x] `fullscreen-media-with-ticker` → media เต็มจอ, ticker ล่าง
- [x] Media player: image slideshow + video loop
- [x] เมื่อมีคิวใหม่ → overlay ใหญ่แสดงเลขคิว 5 วิ → กลับ media

**🧪 ทดสอบ:**
1. Template "split-media" + รูปโปรโมชั่น 3 รูป → TV สไลด์ซ้าย+คิวขวา
2. มีคิวใหม่ → overlay เลขคิว 5 วิ → กลับ slideshow
3. เปลี่ยน template → TV อัปเดตภายใน 5 วิ

---

## 🔊 PHASE 15 — V11: TTS Voice Announcement

> เป้าหมาย: เมื่อเรียกคิว ระบบอ่านเลขคิวออกเสียงอัตโนมัติ

### TTS-01 · TTS Settings
- [ ] เพิ่ม `voiceSettings` ใน branch doc:
  - [ ] `ttsEnabled`, `ttsEngine` (`browser`/`google-cloud`/`openai`/`custom-api`), `ttsLanguage`, `ttsVoice`, `ttsApiKey`, `ttsTemplate`, `ttsVolume`, `repeatCount`
- [ ] `VoiceSettingsPage.tsx` (`/dashboard/voice-settings`):
  - [ ] เลือก engine + config
  - [ ] ปุ่ม "ทดสอบเสียง" (preview TTS)
  - [ ] Template ข้อความ: เช่น `"หมายเลข {{number}} โปรดไปที่ {{counter}}"`

### TTS-02 · TTS Integration บน Display
- [ ] สร้าง `src/utils/tts.ts`:
  - [ ] `speakQueue(ticketNumber, counterName, settings)` — function หลัก
  - [ ] **Browser TTS**: `window.speechSynthesis.speak()` (ไม่ต้อง API key)
  - [ ] **Google Cloud TTS**: POST `/v1/text:synthesize` → AudioContent base64 → Web Audio
  - [ ] **OpenAI TTS**: POST `/v1/audio/speech` → stream → Web Audio
  - [ ] **Custom API**: POST URL ที่กำหนด → audio blob
  - [ ] Queue audio: เล่นทีละใบ ไม่ตัดกัน (audio queue)
- [ ] `DisplayPage.tsx`: เมื่อ `calledTickets` เปลี่ยน → เรียก `speakQueue()`

### TTS-03 · Cloud Function TTS Proxy (Optional)
- [ ] Cloud Function `ttsProxy`: รับ text + engine → return audio (ซ่อน API key จาก client)
- [ ] Firebase App Check ป้องกัน abuse

**🧪 ทดสอบ:**
1. Browser TTS → เรียกคิว → ได้ยิน "หมายเลข เอ หนึ่ง ศูนย์ หนึ่ง โปรดไปที่ เค้าเตอร์ เอ"
2. Google Cloud TTS → เสียงเป็นธรรมชาติขึ้น
3. เรียกหลายคิวพร้อมกัน → เล่นทีละใบ ไม่ตัดกัน

---

## 🔔 PHASE 16 — V12: LINE Messaging API Queue Notification

> เป้าหมาย: แก้ปัญหาเสียงแจ้งเตือนคิวไม่ดังเมื่อลูกค้าปิดหน้าจอ/สลับแอป โดยส่ง Push Message ผ่าน LINE โดยตรงเมื่อถึงคิว

> **⚠️ หมายเหตุ:** ใช้ **LINE Login + Messaging API** เท่านั้น — LINE Notify ถูก deprecated ตั้งแต่ April 2025 และปิดให้บริการสมบูรณ์แล้ว

### สิ่งที่ต้องเตรียมก่อนพัฒนา
- [ ] สมัคร LINE Official Account ที่ [manager.line.biz](https://manager.line.biz)
- [ ] สร้าง LINE Login Channel ที่ [developers.line.biz](https://developers.line.biz) (สำหรับ OAuth)
- [ ] สร้าง LINE Messaging API Channel (สำหรับส่ง Push Message)
- [ ] ตั้งค่า Callback URL ใน LINE Developer Console: `https://[domain]/line-callback`
- [ ] บันทึก secrets ลง Firebase Secret Manager:
  - `LINE_CHANNEL_ID` (Login Channel)
  - `LINE_CHANNEL_SECRET` (Login Channel)
  - `LINE_MESSAGING_ACCESS_TOKEN` (Messaging API Channel)

### Flow การทำงานโดยรวม

```
ลูกค้าสแกน QR → JoinPage (กรอกฟอร์ม)
    ↓ คลิก "รับคิว + แจ้งเตือน LINE"
Redirect → LINE OAuth
    ↓ ลูกค้า Authorize
Redirect → /line-callback?code=xxx&state=queueId
    ↓ LineCallbackPage เรียก Cloud Function
exchangeLINECode → แลก code → lineUserId
    ↓ บันทึก lineUserId ใน queue document
Staff กด "เรียกคิว" → status = CALLED
    ↓ Firestore Trigger: onQueueStatusChangedLINE
ส่ง Push Message → ลูกค้าได้รับ LINE notification
```

---

### LN-01 · Database Schema
- [ ] อัปเดต `QueueItem` interface ใน `src/types/firestore.d.ts`:
  - [ ] เพิ่ม `lineUserId?: string` — LINE User ID จาก OAuth
  - [ ] เพิ่ม `lineLinkedAt?: FirestoreTimestamp` — เวลาที่ link LINE
  - [ ] เพิ่ม `lineNotified?: boolean` — ส่งแจ้งเตือนแล้วหรือยัง
  - [ ] เพิ่ม `lineNotifiedAt?: FirestoreTimestamp` — เวลาที่ส่ง
- [ ] (Optional) เพิ่ม collection `lineConnections` สำหรับจำ LINE ลูกค้าประจำ:
  - [ ] fields: `lineUserId`, `displayName`, `pictureUrl`, `branchId`, `linkedAt`
- [ ] อัปเดต Firestore Security Rules สำหรับ field ใหม่

### LN-02 · Cloud Functions
- [ ] เพิ่ม `axios` dependency ใน `functions/package.json`
- [ ] สร้าง `exchangeLINECode` (HTTPS Callable):
  - [ ] รับ `{ code, queueId, redirectUri }` จาก Frontend
  - [ ] POST ไปยัง `https://api.line.me/oauth2/v2.1/token` เพื่อแลก code → access_token
  - [ ] ใช้ access_token เรียก LINE Profile API (`/v2/profile`) → ได้ `userId`, `displayName`
  - [ ] อัปเดต queue document: `lineUserId`, `lineLinkedAt`
  - [ ] **ไม่เปิดเผย** `LINE_CHANNEL_SECRET` ออกฝั่ง Frontend
  - [ ] Validate: queueId ต้องมีอยู่จริงใน Firestore และ status ยังเป็น WAITING
- [ ] สร้าง `onQueueStatusChangedLINE` (Firestore Trigger):
  - [ ] Trigger: `queues/{queueId}` onWrite
  - [ ] ตรวจสอบ: status เปลี่ยนจาก WAITING → CALLED เท่านั้น
  - [ ] ตรวจสอบ: ticket มี `lineUserId` และ `lineNotified !== true`
  - [ ] ส่ง Push Message ผ่าน LINE Messaging API:
    ```
    POST https://api.line.me/v2/bot/message/push
    Authorization: Bearer {MESSAGING_ACCESS_TOKEN}
    { to: lineUserId, messages: [{ type: 'text', text: '...' }] }
    ```
  - [ ] ข้อความแจ้งเตือน:
    ```
    🔔 ถึงคิวของคุณแล้ว!

    คิวหมายเลข A-012
    กรุณาเข้ารับบริการที่เคาน์เตอร์
    ```
  - [ ] อัปเดต: `lineNotified: true`, `lineNotifiedAt: serverTimestamp()`
  - [ ] Error handling: log ใน `notifications` collection หาก LINE API ล้มเหลว

### LN-03 · Frontend
- [ ] สร้าง `src/features/lineNotification/hooks/useLINELink.ts`:
  - [ ] function `buildLINEAuthURL(queueId, branchId)` → สร้าง LINE OAuth URL
  - [ ] parameters: `client_id`, `redirect_uri`, `state=queueId`, `scope=profile`
  - [ ] function `redirectToLINE(queueId)` → `window.location.href = authUrl`
- [ ] สร้าง `src/features/lineNotification/components/LineCallbackPage.tsx`:
  - [ ] อ่าน `?code=xxx&state=queueId` จาก URL params
  - [ ] เรียก Cloud Function `exchangeLINECode({ code, queueId, redirectUri })`
  - [ ] แสดง loading → success (navigate ไป `/status/:queueId`) → error
- [ ] สร้าง `src/features/lineNotification/components/LINEConnectButton.tsx`:
  - [ ] ปุ่มสีเขียว LINE พร้อม icon
  - [ ] รับ `queueId` เป็น prop
  - [ ] กด → เรียก `redirectToLINE(queueId)`
- [ ] แก้ไข `src/features/queues/components/JoinPage.tsx`:
  - [ ] หลัง `createQueueItem` สำเร็จ: แสดง modal/banner ถามว่าต้องการรับแจ้งเตือน LINE
  - [ ] ถ้าเลือก "รับแจ้งเตือน" → redirect ไป LINE OAuth
  - [ ] ถ้าข้าม → navigate ไป `/status/:id` เหมือนเดิม
- [ ] แก้ไข `src/features/queues/components/TicketStatusPage.tsx`:
  - [ ] ตรวจสอบ `ticket.lineUserId` — ถ้ายังไม่มีและ status เป็น WAITING → แสดงปุ่ม `LINEConnectButton`
  - [ ] ถ้า linked แล้ว → แสดง badge "LINE แจ้งเตือนเปิดอยู่" พร้อมชื่อ LINE
- [ ] แก้ไข `src/routes/AppRoutes.tsx`:
  - [ ] เพิ่ม route `/line-callback` → `LineCallbackPage` (ใต้ PublicLayout)

### LN-04 · Environment & Security
- [ ] เพิ่มใน `.env` / `.env.example`:
  ```env
  VITE_LINE_CHANNEL_ID=your_line_login_channel_id
  VITE_LINE_CALLBACK_URL=http://localhost:3000/line-callback
  ```
- [ ] เพิ่ม secrets ใน Firebase Functions config (Secret Manager หรือ `.env` ของ Functions):
  ```
  LINE_CHANNEL_SECRET=...
  LINE_MESSAGING_ACCESS_TOKEN=...
  ```
- [ ] ตรวจสอบ Firestore Security Rules:
  - [ ] ลูกค้าอัปเดต `lineUserId` ของตัวเองได้ผ่าน Cloud Function เท่านั้น (ไม่ allow direct client write)

**🧪 ทดสอบ:**
1. JoinPage → กรอกชื่อ → submit → คลิก "รับแจ้งเตือน LINE" → redirect ไป LINE OAuth
2. Authorize → กลับมา `/line-callback` → ตรวจ Firestore ว่า queue doc มี `lineUserId`
3. TicketStatusPage → แสดง badge "LINE แจ้งเตือนเปิดอยู่"
4. Staff กด "Call Next" → ตรวจสอบว่าได้รับ LINE message บนมือถือ
5. Firestore ตรวจสอบ `lineNotified: true`
6. กด recall อีกครั้ง → **ไม่**ส่งซ้ำ (lineNotified ป้องกัน spam)

---


## 🗂️ ลำดับงานที่แนะนำสำหรับ AI Codegen

ให้ AI สร้างโค้ดทีละ task ตามลำดับนี้:

```
Step 1:  TS-01   → LoginForm + SignupForm + authRepository
Step 2:  TS-01b  → OnboardingForm + Tenant creation
Step 3:  TS-02   → Cloud Functions (Custom Claims)
Step 4:  QC-01a  → branchRepository + BranchListPage + BranchForm
Step 5:  QC-01b  → serviceRepository + ServiceListPage + ServiceForm
Step 6:  QC-01c  → QRPosterModal
Step 7:  QC-02   → queueRepository (create/read) + JoinPage + TicketStatusPage
Step 8:  QC-03   → queueRepository (actions) + QueueConsolePage
Step 9:  TV-01   → DisplayPage
Step 10: TV-02   → StaffListPage + inviteRepository
Step 11: DEPLOY-01 → Firestore Rules + Build + Deploy
Step 12: SET-01  → SettingsPage
Step 13: WF-01   → Workflow Builder
Step 14: WF-02   → Multi-stage Queue
Step 15: AP-01   → Booking Calendar
Step 16: AP-02   → Appointment Check-In
Step 17: DEV-01  → Developer Portal & Webhooks
Step 18: QR-01   → Queue Range System
Step 24: LN-01   → LINE Schema (firestore.d.ts)
Step 25: LN-02   → Cloud Functions (exchangeLINECode + onQueueStatusChangedLINE)
Step 26: LN-03   → Frontend (LineCallbackPage + LINEConnectButton + JoinPage + TicketStatusPage + Routes)
Step 27: LN-04   → Environment & Security
Step 28: WP-01   → Service Worker + VAPID Setup
Step 29: WP-02   → Firebase Cloud Messaging (FCM) Integration
Step 30: WP-03   → Frontend (usePushNotification hook + PermissionPrompt + JoinPage + TicketStatusPage)
Step 31: WP-04   → Cloud Function (sendWebPushOnCall) + Firestore Schema
```

---

## 🌐 PHASE 17 — V13: Web Push Notifications + Service Worker

> เป้าหมาย: แก้ปัญหาเสียงแจ้งเตือนคิวไม่ทำงานเมื่อ Browser ถูก Suspend / ปิดหน้าจอ โดยใช้ **Web Push API + Service Worker** ซึ่งทำงานได้แม้หน้าต่าง Browser จะถูกซ่อนหรือปิดอยู่

> **⭐ แนะนำที่สุดสำหรับ Background Notification** — ทำงานได้บน Chrome/Edge/Android โดยไม่ต้องติดตั้งแอป ไม่ต้องมีบัญชี LINE รองรับ iOS 16.4+ (ผ่าน Add to Home Screen)

> **เปรียบเทียบกับ Phase 16 (LINE):**
> | | Web Push (Phase 17) | LINE (Phase 16) |
> |---|---|---|
> | ต้องมีบัญชี | ❌ ไม่ต้อง | ✅ ต้องมี LINE |
> | Background | ✅ ทำงานได้ | ✅ ทำงานได้ |
> | iOS Support | ⚠️ 16.4+ เท่านั้น | ✅ ทุก version |
> | Setup ฝั่ง server | ✅ ใช้ FCM ฟรี | ❌ ต้องมี LINE OA |
> | UX | Native popup | LINE chat |

### Flow การทำงานโดยรวม

```
ลูกค้าสแกน QR → JoinPage
    ↓ แสดง Permission Prompt "อนุญาตรับแจ้งเตือน?"
Browser Notification Permission → granted
    ↓ Service Worker ลงทะเบียน FCM
ได้ PushSubscription token (FCM token)
    ↓ บันทึก fcmToken ใน queue document
Staff กด "เรียกคิว" → status = CALLED
    ↓ Firestore Trigger: sendWebPushOnCall
Cloud Function ส่ง FCM Push Message
    ↓ Service Worker รับ push event
แสดง Native OS Notification popup บนมือถือ/PC
```

---

### WP-01 · Service Worker & VAPID Setup
- [ ] สร้าง `public/firebase-messaging-sw.js` (Service Worker สำหรับ FCM):
  - [ ] import `importScripts` Firebase App + Messaging
  - [ ] `messaging.onBackgroundMessage()` — รับ push เมื่อ app ปิด/hidden
  - [ ] แสดง `self.registration.showNotification()` พร้อม icon + badge + click action
  - [ ] Notification click → เปิด `/status/:ticketId` ใน browser tab
- [ ] เปิดใช้งาน **Firebase Cloud Messaging (FCM)** ใน Firebase Console:
  - [ ] สร้าง Web Push certificate → ได้ **VAPID Key**
  - [ ] เพิ่ม `VITE_FIREBASE_VAPID_KEY` ใน `.env`
- [ ] อัปเดต `src/config/firebase.ts`:
  - [ ] `import { getMessaging } from 'firebase/messaging'`
  - [ ] export `messaging` instance

### WP-02 · FCM Token Management
- [ ] อัปเดต `QueueItem` interface ใน `src/types/firestore.d.ts`:
  - [ ] เพิ่ม `fcmToken?: string` — FCM registration token
  - [ ] เพิ่ม `fcmTokenSavedAt?: FirestoreTimestamp`
  - [ ] เพิ่ม `pushNotified?: boolean` — ส่ง web push แล้วหรือยัง
  - [ ] เพิ่ม `pushNotifiedAt?: FirestoreTimestamp`
- [ ] สร้าง Cloud Function `sendWebPushOnCall` (Firestore Trigger):
  - [ ] Trigger: `queues/{queueId}` onWrite
  - [ ] ตรวจสอบ: status เปลี่ยนจาก WAITING → CALLED
  - [ ] ตรวจสอบ: ticket มี `fcmToken` และ `pushNotified !== true`
  - [ ] ส่ง FCM Push ผ่าน Firebase Admin SDK:
    ```typescript
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: '🔔 ถึงคิวของคุณแล้ว!',
        body: `คิวหมายเลข ${queueNumber} — กรุณาเข้ารับบริการ`,
      },
      webpush: {
        fcmOptions: { link: `/status/${queueId}` },
        notification: { icon: '/icons/icon-192.png', badge: '/icons/badge-72.png' }
      }
    });
    ```
  - [ ] อัปเดต: `pushNotified: true`, `pushNotifiedAt: serverTimestamp()`
  - [ ] Error handling: ถ้า token หมดอายุ (error code `registration-token-not-registered`) → ล้าง `fcmToken`

### WP-03 · Frontend Integration
- [ ] สร้าง `src/features/pushNotification/hooks/usePushNotification.ts`:
  - [ ] `requestPermission()` — ขอสิทธิ์ `Notification.permission`
  - [ ] `getFCMToken()` — เรียก `getToken(messaging, { vapidKey })` → ได้ token
  - [ ] `saveTokenToQueue(queueId, token)` — บันทึก `fcmToken` ลง Firestore queue doc
  - [ ] Handle permission states: `default` / `granted` / `denied`
  - [ ] `onMessage()` — รับ push เมื่อ app ยังเปิดอยู่ (foreground)
- [ ] สร้าง `src/features/pushNotification/components/PushPermissionPrompt.tsx`:
  - [ ] Card/Banner "อนุญาตรับแจ้งเตือนเมื่อถึงคิว?"
  - [ ] ปุ่ม "อนุญาต" (สีหลัก) + ปุ่ม "ข้ามไปก่อน" (secondary)
  - [ ] แสดงสถานะ: รอ / granted / denied (พร้อมคำแนะนำวิธีเปิดในการตั้งค่า)
  - [ ] ถ้า `denied` → แสดงขั้นตอนเปิดใช้งาน notification ใน browser settings
- [ ] แก้ไข `src/features/queues/components/JoinPage.tsx`:
  - [ ] หลัง `createQueueItem` สำเร็จ: แสดง `PushPermissionPrompt` เป็นขั้นตอนแรก
  - [ ] เมื่อกด "อนุญาต" → `requestPermission()` → `getFCMToken()` → `saveTokenToQueue()`
  - [ ] เมื่อสำเร็จ → navigate ไป `/status/:id`
  - [ ] ถ้าเบราว์เซอร์ไม่รองรับ Notification API → ข้ามขั้นตอนนี้อัตโนมัติ
- [ ] แก้ไข `src/features/queues/components/TicketStatusPage.tsx`:
  - [ ] ตรวจสอบ `ticket.fcmToken` — ถ้ายังไม่มี → แสดงปุ่ม "เปิดรับแจ้งเตือน"
  - [ ] ถ้ามีแล้ว → แสดง badge "🔔 แจ้งเตือนเปิดอยู่"
  - [ ] Foreground handler: เมื่อ `onMessage()` trigger → แสดง in-app toast/banner

### WP-04 · PWA Manifest & Icons
- [ ] อัปเดต `public/manifest.json`:
  - [ ] `display: "standalone"`, `background_color`, `theme_color`
  - [ ] Icons ขนาด 192x192, 512x512 สำหรับ Home Screen
- [ ] สร้าง `public/icons/icon-192.png`, `icon-512.png`, `badge-72.png`
- [ ] อัปเดต `index.html`:
  - [ ] `<link rel="manifest" href="/manifest.json" />`
  - [ ] `<meta name="theme-color" content="..." />`
  - [ ] `<link rel="apple-touch-icon" href="/icons/icon-192.png" />`
- [ ] ทดสอบ Add to Home Screen บน iOS 16.4+ เพื่อรับ Push

**🧪 ทดสอบ:**
1. JoinPage → กรอกชื่อ → รับคิว → แสดง Permission Prompt
2. กด "อนุญาต" → Browser แสดง native permission dialog → กด Allow
3. ตรวจ Firestore ว่า queue doc มี `fcmToken`
4. Staff กด "Call Next" → ตรวจสอบว่าได้รับ Native OS notification บนมือถือ
   - ✅ เมื่อ Browser เปิดอยู่ → in-app toast
   - ✅ เมื่อ Browser ปิดหน้าจอ → OS notification popup
   - ✅ เมื่อ Browser ปิดแอป (Android) → notification ยังดัง
5. คลิก notification → เปิด `/status/:ticketId` โดยตรง
6. Firestore ตรวจสอบ `pushNotified: true`
7. ทดสอบบน iOS 16.4+ (Add to Home Screen) → ได้รับ push notification

---

*อัปเดตไฟล์นี้ทุกครั้งที่ task เสร็จ โดยเปลี่ยน `[ ]` → `[x]` และอัปเดต Progress Summary*
