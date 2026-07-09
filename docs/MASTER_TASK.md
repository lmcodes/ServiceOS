# ServiceOS — Master Task Tracker

> Last Updated: 2026-07-10 | Stack: React + Vite + TypeScript + TailwindCSS + Firebase

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
- [x] ติดตั้ง dependencies หลัก (react-router-dom, @tanstack/react-query, firebase, zod, lucide-react, date-fns)
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

### TS-02 · RBAC — Role-Based Access Control

#### Cloud Functions (Firebase Functions)
- [ ] ตั้งค่า Firebase Cloud Functions project (`functions/` folder)
- [ ] สร้าง function `onUserCreated` (trigger: `auth.user().onCreate`)
  - [ ] inject custom claims: `{ tenantId, role: 'owner', branchIds: [] }`
  - [ ] เรียก `admin.auth().setCustomUserClaims(uid, claims)`
- [ ] สร้าง Callable function `setUserRole` (เปลี่ยน role/branchIds)
- [ ] Deploy functions ไปยัง Firebase

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
- [ ] สร้าง `src/features/branches/repository/branchRepository.ts`
  - [ ] `getBranches(tenantId)` — real-time listener
  - [ ] `createBranch(tenantId, data)`
  - [ ] `updateBranch(branchId, data)`
  - [ ] `deleteBranch(branchId)` (soft delete: status → 'inactive')
  - [ ] เพิ่ม Firestore Security Rules สำหรับ `/branches`

#### Hooks
- [ ] `src/features/branches/hooks/useBranches.ts` (useQuery/useRealtime)
- [ ] `src/features/branches/hooks/useCreateBranch.ts` (useMutation)
- [ ] `src/features/branches/hooks/useUpdateBranch.ts` (useMutation)

#### Components & Pages
- [ ] `BranchListPage.tsx` — แสดง branch cards, ปุ่ม "Add Branch"
- [ ] `BranchForm.tsx` — Modal/Drawer form:
  - [ ] Input: Name, Code, Address, Phone, Email
  - [ ] Operating Hours picker (วัน + open/close time)
  - [ ] Timezone dropdown
  - [ ] Validation ด้วย `zod`
- [ ] เชื่อมกับ `/dashboard/branches` route

**🧪 ทดสอบ:**
1. สร้าง branch ใหม่ → ปรากฏในรายการ + Firestore
2. แก้ไข operating hours → บันทึกสำเร็จ
3. Staff account เข้าหน้า Branches → redirect (403)

---

### QC-01b · Service Management

#### Repository
- [ ] สร้าง `src/features/services/repository/serviceRepository.ts`
  - [ ] `getServices(branchId)` — real-time listener
  - [ ] `createService(branchId, data)`
  - [ ] `updateService(serviceId, data)`
  - [ ] `toggleServiceActive(serviceId, isActive)`

#### Components & Pages
- [ ] `ServiceListPage.tsx` — ตาราง services per branch, toggle Active/Inactive
- [ ] `ServiceForm.tsx` — Modal form:
  - [ ] Input: Name, Description, Category, Estimated Duration (นาที)
  - [ ] Max Concurrent, Requires Resource toggle
  - [ ] Custom Fields builder (เพิ่ม/ลบ field แบบ dynamic)
  - [ ] Validation ด้วย `zod`
- [ ] เชื่อมกับ `/dashboard/services` route

**🧪 ทดสอบ:**
1. สร้าง service "General Consultation" duration 15 นาที → ปรากฏในรายการ
2. เพิ่ม custom field "ID Card Number" (required) → บันทึกสำเร็จ
3. Toggle inactive → หายจากหน้า QR Join

---

### QC-01c · QR Code Generation
- [ ] ติดตั้ง library generate QR (เช่น `qrcode.react`)
- [ ] สร้าง `QRPosterModal.tsx` — แสดง QR code ของ branch
  - [ ] URL format: `https://[domain]/join/{branchId}`
  - [ ] ปุ่ม "Download QR" (export เป็น PNG)
  - [ ] ปุ่ม "Print Poster"
- [ ] เพิ่มปุ่ม "QR Code" ในหน้า Branch detail

**🧪 ทดสอบ:**
1. กด "QR Code" → Modal โชว์ QR image
2. Scan QR ด้วยมือถือ → เปิดหน้า `/join/{branchId}` ได้

---

## 🎟️ PHASE 3 — Customer Queue & Staff Console (Sprint 3)

> เป้าหมาย: ลูกค้าเข้าคิวผ่าน QR + Staff เรียกคิวได้

### QC-02 · Customer QR Self Check-In

#### Repository
- [ ] สร้าง `src/features/queues/repository/queueRepository.ts`
  - [ ] `createQueueItem(branchId, serviceId, customerData)` — Firestore transaction increment counter
  - [ ] `getQueueItemById(ticketId)` — real-time listener
  - [ ] `cancelQueueItem(ticketId)`

#### Components & Pages
- [ ] `JoinPage.tsx` (`/join/:branchId`) — Public page:
  - [ ] ดึง branch info + active services
  - [ ] แสดง service selector cards
  - [ ] Form: Customer Name (required), Phone (optional)
  - [ ] Custom Fields ตาม service config
  - [ ] Firestore transaction: increment `currentQueueNumber` → สร้าง `QueueItem` status `WAITING`
  - [ ] redirect → `/status/{ticketId}`
- [ ] `TicketStatusPage.tsx` (`/status/:ticketId`) — Public page:
  - [ ] real-time listener แสดงเลขคิว (e.g. "A-042")
  - [ ] แสดงจำนวนคนที่รออยู่หน้า + estimated wait time
  - [ ] ปุ่ม "Cancel Ticket"
  - [ ] แสดง status badge (WAITING / CALLED / SERVING / COMPLETED)
  - [ ] เล่น sound alert เมื่อ status เปลี่ยนเป็น CALLED

**🧪 ทดสอบ:**
1. Scan QR → เลือก service → กรอกชื่อ → ได้เลขคิว A-001
2. คนที่ 2 join → ได้ A-002, หน้า status แสดง "1 person ahead"
3. Staff call ticket → หน้า status ของลูกค้า update เป็น CALLED ภายใน 2 วินาที
4. กด Cancel → status เป็น CANCELLED + ไม่ปรากฏใน staff console

---

### QC-03 · Staff Queue Control Console

#### Repository (เพิ่มใน queueRepository)
- [ ] `getActiveQueueItems(branchId)` — real-time listener (status ≠ COMPLETED/CANCELLED)
- [ ] `callNextTicket(branchId, staffUserId)` — transaction: oldest WAITING → CALLED
- [ ] `startServingTicket(ticketId, staffUserId)` — CALLED → SERVING
- [ ] `completeTicket(ticketId)` — SERVING → COMPLETED + log audit
- [ ] `markNoShow(ticketId)` — CALLED → NO_SHOW + log audit
- [ ] `recallTicket(ticketId)` — re-call CALLED ticket

#### Hooks
- [ ] `useActiveQueue(branchId)` — real-time subscription
- [ ] `useQueueActions()` — mutation wrappers

#### Components & Pages
- [ ] `QueueConsolePage.tsx` (`/dashboard/queues`):
  - [ ] Header cards: Waiting / Serving / Completed (today)
  - [ ] ปุ่ม "Call Next Ticket" (ใหญ่, prominent)
  - [ ] Real-time list: แสดง ticket cards แบ่งตาม status
  - [ ] Ticket Card component:
    - [ ] เลขคิว, ชื่อ, service name, เวลารอ
    - [ ] Action buttons: Start / Complete / No-Show / Re-call
  - [ ] Filter tabs: All / Waiting / Serving / Completed
  - [ ] Branch selector (ถ้า staff มีหลาย branch)

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
- [ ] `getDisplayData(branchId)` — real-time listener (CALLED + WAITING list)

#### Components & Pages
- [ ] `DisplayPage.tsx` (`/display/:branchId`):
  - [ ] Layout 2 columns: "Now Calling" (ใหญ่) + "Waiting List"
  - [ ] "Now Calling" box: เลขคิว flash animation + เสียง ding
  - [ ] "Waiting List": แสดง ticket ที่รอต่อไป (max 8 รายการ)
  - [ ] Footer: ชื่อสาขา + เวลา real-time clock
  - [ ] รองรับ Full Screen (ปุ่ม fullscreen หรือ auto on load)
  - [ ] ดึง branch info แสดงชื่อสาขา + logo

**🧪 ทดสอบ:**
1. เปิดหน้า `/display/{branchId}` บน TV browser
2. Staff กด "Call Next" → เลขคิวปรากฏบน TV ภายใน 1-2 วินาที
3. เสียง ding ดังเมื่อมีการเรียกใหม่
4. หน้า fit พอดี 1080p

---

### TV-02 · Staff Management (Invite Staff)
- [ ] `StaffListPage.tsx` (`/dashboard/staff`):
  - [ ] ตาราง staff members: ชื่อ, Email, Role, Branch assignments
  - [ ] ปุ่ม "Invite Staff" → Modal form (email, role, branch assignment)
- [ ] `inviteStaffRepository.ts`:
  - [ ] สร้าง `/users/{uid}` doc กับ status `invited`
  - [ ] เรียก Cloud Function เพื่อ set custom claims
  - [ ] ส่ง invite email (Firebase Email Link หรือ Cloud Function)
- [ ] ปุ่ม "Edit Role" + "Deactivate"

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
- [ ] `SettingsPage.tsx` (`/dashboard/settings`) — owner only:
  - [ ] แก้ไข Business Name, Logo (upload to Storage), Timezone
  - [ ] Subscription info section (plan, usage)
  - [ ] Danger Zone: "Cancel Subscription"
- [ ] `uploadLogo()` → Firebase Storage + อัปเดต `/tenants/{id}` doc

**🧪 ทดสอบ:** Upload logo → ปรากฏใน Dashboard sidebar

---

## 🔄 PHASE 6 — V2: Multi-Step Workflow Engine

> เป้าหมาย: รองรับบริการแบบหลายขั้นตอน เช่น คลินิก (ตรวจ → พบแพทย์ → จ่ายยา)

### WF-01 · Workflow Template Builder
- [ ] สร้าง `workflows` collection + Firestore schema
- [ ] `WorkflowBuilderPage.tsx` ใน branch settings:
  - [ ] สร้าง/แก้ไข workflow template
  - [ ] เพิ่ม/ลบ/เรียงลำดับ stages
  - [ ] กำหนด transition rules ต่อ stage
- [ ] เชื่อม Service กับ Workflow template (workflowId field)

### WF-02 · Multi-Stage Queue Operations
- [ ] แก้ไข `QueueItem` เพิ่ม `currentStageId`, `workflowHistory[]`
- [ ] Cloud Function `onWorkflowTransition` — enforce transition rules
- [ ] Staff console filter by current stage
- [ ] Action buttons: "Advance to Next Stage"

**🧪 ทดสอบ:** สร้าง 2-stage workflow → ticket ผ่าน Stage 1 → Staff advance → ticket ปรากฏใน Stage 2 queue

---

## 📅 PHASE 7 — V3: Appointment Scheduler

### AP-01 · Customer Booking Calendar
- [ ] Public route `/booking/:branchId`
- [ ] Calendar component (date picker + time slot grid)
- [ ] Cloud Function `checkSlotAvailability` — ตรวจ overlap
- [ ] Booking form: ชื่อ, email, phone
- [ ] สร้าง `/appointments` doc status `CONFIRMED`
- [ ] ส่ง confirmation email (SendGrid / Firebase Extension)

### AP-02 · Appointment Check-In
- [ ] `AppointmentsPage.tsx` (`/dashboard/appointments`):
  - [ ] ตารางนัดหมายวันนี้
  - [ ] ปุ่ม "Check In" → update status → สร้าง `QueueItem` priority 5
- [ ] SMS reminder integration (Twilio)

**🧪 ทดสอบ:** จอง appointment → มาถึง → receptionist check in → ticket ปรากฏใน queue console ก่อนคนอื่น

---

## 💳 PHASE 8 — V4: Analytics & Billing

### ANL-01 · Analytics Dashboard
- [ ] `AnalyticsPage.tsx` — owner/admin only:
  - [ ] กราฟ daily queue volume (7/30 วัน)
  - [ ] Average wait time trends
  - [ ] Busiest hours heatmap
  - [ ] Per-service breakdown
- [ ] อ่านข้อมูลจาก `dailyMetrics` sub-collection

### BILL-01 · Stripe Integration
- [ ] ติดตั้ง Stripe SDK ใน Cloud Functions
- [ ] สร้าง Cloud Function `createCheckoutSession`
- [ ] Cloud Function `stripeWebhook` — handle subscription events
- [ ] `SubscriptionPage.tsx` — แสดง plan, ปุ่ม Upgrade, Billing Portal link

---

## 🔌 PHASE 9 — V5: Developer Portal

### DEV-01 · API & Webhooks
- [ ] `DeveloperPage.tsx` — generate API tokens
- [ ] Cloud Functions: Public REST API endpoints
- [ ] Webhook system — fire on queue status changes

---

## 📊 Progress Summary

| Phase | ชื่อ | สถานะ | ความคืบหน้า |
|---|---|---|---|
| 0 | Foundation | ✅ เสร็จแล้ว | 100% |
| 1 | Auth & Tenant | 🔄 กำลังดำเนินการ | 80% (TS-01 ✅, TS-01b ✅, TS-02 ⬜) |
| 2 | Branch & Services | ⬜ ยังไม่เริ่ม | 0% |
| 3 | Queue & Staff Console | ⬜ ยังไม่เริ่ม | 0% |
| 4 | TV Display & Deploy | ⬜ ยังไม่เริ่ม | 0% |
| 5 | Settings | ⬜ ยังไม่เริ่ม | 0% |
| 6 | V2 Workflow Engine | ⬜ ยังไม่เริ่ม | 0% |
| 7 | V3 Appointments | ⬜ ยังไม่เริ่ม | 0% |
| 8 | V4 Analytics & Billing | ⬜ ยังไม่เริ่ม | 0% |
| 9 | V5 Developer Portal | ⬜ ยังไม่เริ่ม | 0% |

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
```

---

*อัปเดตไฟล์นี้ทุกครั้งที่ task เสร็จ โดยเปลี่ยน `[ ]` → `[x]` และอัปเดต Progress Summary*
