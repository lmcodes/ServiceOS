# ServiceOS — Use Cases

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## UC-01: Tenant Onboarding

**Actor**: Business Owner
**Precondition**: None
**Trigger**: Owner visits ServiceOS website and clicks "Get Started"

### Main Flow
1. Owner signs up with email/password or Google OAuth
2. System creates Firebase Auth account
3. System presents "Create Your Business" form
4. Owner enters: Business Name, Business Type, Phone, Address
5. System creates Tenant document with `status: active`
6. System creates default Subscription (Free tier)
7. System assigns Owner role to the user
8. System redirects to Branch Setup wizard

### Postconditions
- Tenant exists in Firestore
- Owner has `owner` role
- Free subscription is active
- Audit log entry created

### Exceptions
- E1: Email already registered → Show "Account exists" with login link
- E2: Google OAuth fails → Show error, offer email signup
- E3: Tenant name already taken → Allow (tenants identified by ID, not name)

---

## UC-02: Branch Setup

**Actor**: Owner / Admin
**Precondition**: Tenant exists, user has `owner` or `admin` role
**Trigger**: Owner completes tenant setup or clicks "Add Branch"

### Main Flow
1. Owner clicks "Add Branch"
2. System checks subscription branch limit
3. Owner enters: Branch Name, Address, Phone, Operating Hours
4. Owner selects business type template (or inherits from tenant)
5. System creates Branch document linked to Tenant
6. System generates unique QR code for the branch
7. System generates public display URL
8. System redirects to Service Setup

### Postconditions
- Branch document created under tenant
- QR code generated and stored
- Display URL active
- Branch count incremented in subscription usage

### Exceptions
- E1: Branch limit reached → Show upgrade prompt
- E2: Duplicate branch name (same tenant) → Show warning, allow override

---

## UC-03: Service Configuration

**Actor**: Owner / Admin / Manager
**Precondition**: Branch exists
**Trigger**: User navigates to branch settings → services

### Main Flow
1. User clicks "Add Service"
2. User enters: Service Name, Description, Estimated Duration, Category
3. User optionally sets: Max concurrent, Required resources
4. System validates against subscription service limit
5. System creates Service document linked to Branch
6. Service appears in queue creation form and QR entry form

### Postconditions
- Service is available for queue creation
- Service appears on customer-facing QR queue page

### Exceptions
- E1: Service limit reached → Show upgrade prompt
- E2: Duplicate service name in branch → Show error

---

## UC-04: Customer Joins Queue via QR

**Actor**: Customer (walk-in)
**Precondition**: Branch has active QR code, branch is within operating hours
**Trigger**: Customer scans QR code at branch entrance

### Main Flow
1. Customer scans QR code with phone camera
2. Phone opens ServiceOS public queue page (no auth required)
3. Page shows: Branch name, current queue length, estimated wait
4. Customer enters: Name, Phone (optional), selects Service
5. Customer taps "Join Queue"
6. System creates QueueItem with `status: WAITING`
7. System assigns queue number (e.g., A001)
8. System shows confirmation: queue number, position, estimated wait
9. Page auto-updates position in real-time via Firestore listener

### Postconditions
- QueueItem created in Firestore
- Customer sees live position updates
- Queue display updates to show new count
- Staff sees new item in queue list

### Exceptions
- E1: Branch outside operating hours → Show "Currently closed" message
- E2: Queue daily limit reached (free tier) → Show "Queue full" message
- E3: Customer submits without name → Validation error

---

## UC-05: Staff Calls Next Customer

**Actor**: Staff
**Precondition**: Queue has WAITING items, staff is logged in
**Trigger**: Staff clicks "Call Next" or selects specific customer

### Main Flow
1. Staff clicks "Call Next" button
2. System selects oldest WAITING item (FIFO, respecting priority)
3. System updates QueueItem `status: WAITING → CALLED`
4. System records `calledAt` timestamp and `calledBy` user
5. Queue display shows: "A001 — Please proceed to Counter 3"
6. Customer's phone shows: "You've been called!"
7. If SMS enabled, system sends SMS notification
8. Staff sees customer details on their screen

### Alternative: Manual Selection
1. Staff selects specific customer from waiting list
2. System updates that specific item to CALLED
3. Same postconditions apply

### Postconditions
- QueueItem status is CALLED
- Display updated
- Customer notified
- Audit log entry created

### Exceptions
- E1: No waiting customers → Show "Queue empty" message
- E2: Customer already called by another staff → Show conflict warning

---

## UC-06: Staff Marks Service Complete

**Actor**: Staff
**Precondition**: QueueItem is in SERVING status
**Trigger**: Service delivery is finished

### Main Flow
1. Staff clicks "Complete" on current serving item
2. System updates `status: SERVING → COMPLETED`
3. System records `completedAt` timestamp
4. System calculates `serviceTime = completedAt - servingStartedAt`
5. Queue display removes completed item
6. Staff's view refreshes to show next callable item
7. Analytics counters updated (completed count, avg service time)

### Postconditions
- QueueItem is COMPLETED (terminal state)
- Metrics updated
- Audit log entry

### Exceptions
- E1: Item was already completed → No-op with warning

---

## UC-07: Mark No-Show

**Actor**: Staff
**Precondition**: QueueItem is CALLED and customer hasn't appeared
**Trigger**: Staff waits configured timeout, customer doesn't appear

### Main Flow
1. Staff clicks "No Show" on called item
2. System updates `status: CALLED → NO_SHOW`
3. System records `noShowAt` timestamp
4. System auto-calls next WAITING item (configurable)
5. Queue display updates
6. No-show counter incremented for analytics

### Postconditions
- QueueItem is NO_SHOW (terminal state)
- Next customer auto-called (if configured)
- Audit log entry

---

## UC-08: Queue Display

**Actor**: Display Screen (TV/Monitor in waiting area)
**Precondition**: Branch exists with display URL
**Trigger**: Display URL opened in browser (full-screen kiosk mode)

### Main Flow
1. Staff/owner opens display URL on TV browser
2. System loads public display page (no auth required)
3. Display shows: Currently serving numbers, Recently called, Waiting count
4. Display auto-refreshes via Firestore real-time listener
5. When a new number is called, display shows animation + optional audio
6. Display cycles between queue view and custom messages (configurable)

### Postconditions
- Display reflects real-time queue state
- No manual refresh needed
- Works on any browser (Smart TV, tablet, laptop)

---

## UC-09: Multi-Step Workflow Queue (Clinic)

**Actor**: Staff at each stage
**Precondition**: Workflow configured with stages, queue item created
**Trigger**: Patient registered and enters workflow

### Main Flow
1. Registration staff creates queue item → enters REGISTRATION stage
2. Registration complete → staff advances to SCREENING stage
3. Screening nurse picks up patient → advances to DOCTOR stage
4. Doctor assignment → staff assigns specific doctor
5. Doctor completes consultation → advances to PAYMENT stage
6. Payment complete → advances to PHARMACY stage
7. Pharmacy dispenses → marks COMPLETED

### At Each Stage Transition:
- System validates transition is allowed (state machine)
- System records stage entry/exit timestamps
- System updates display for that stage
- System notifies patient of stage change
- Previous stage staff's view clears the item
- Next stage staff's view shows the item

### Postconditions
- Complete stage-by-stage audit trail
- Per-stage time metrics available
- Patient journey fully tracked

---

## UC-10: Appointment Booking

**Actor**: Customer
**Precondition**: Branch has appointments enabled (Professional+ tier)
**Trigger**: Customer accesses booking page

### Main Flow
1. Customer opens booking URL or scans booking QR
2. System shows available services and time slots
3. Customer selects: Service, Date, Time, preferred staff (optional)
4. Customer enters: Name, Phone, Email
5. System checks availability (no double-booking)
6. System creates Appointment with `status: CONFIRMED`
7. System sends confirmation email/SMS
8. On appointment day, system auto-creates QueueItem at scheduled time
9. Appointment queue items get priority in the queue

### Postconditions
- Appointment created and confirmed
- Calendar slot blocked
- Auto-queue creation scheduled
- Confirmation sent

### Exceptions
- E1: Slot no longer available → Show "Slot taken" with alternatives
- E2: Customer cancels → Slot freed, cancellation recorded

---

## UC-11: Owner Reviews Analytics

**Actor**: Owner
**Precondition**: Tenant has history data, user has owner/admin role
**Trigger**: Owner opens Analytics dashboard

### Main Flow
1. Owner navigates to Analytics section
2. System shows today's overview: Total served, Avg wait, No-show rate
3. Owner selects date range and branch filter
4. System displays: Queue volume trend, Peak hours, Service breakdown
5. Owner drills into specific metric
6. Owner exports report as CSV

### Postconditions
- Owner has actionable data
- Export file generated

---

## UC-12: Tenant User Management

**Actor**: Owner / Admin
**Precondition**: Tenant exists
**Trigger**: Owner needs to add/remove staff

### Main Flow
1. Owner navigates to Settings → Users
2. Owner clicks "Invite User"
3. Owner enters: Email, Role (Admin/Manager/Staff), Branch assignment
4. System creates invitation (or links existing Firebase user)
5. Invited user receives email with setup link
6. User sets password and logs in
7. User sees only their assigned branch(es)

### Postconditions
- User account created/linked
- Role assigned
- Branch access scoped
- Audit log entry

### Exceptions
- E1: Email already in different tenant → Error (user belongs to one tenant)
- E2: User limit reached → Upgrade prompt
