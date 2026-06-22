# ServiceOS — User Personas

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## Persona 1: Business Owner — "Somchai"

### Demographics
- **Role**: Restaurant owner, 2 branches
- **Age**: 35-50
- **Tech Comfort**: Moderate (uses LINE, Facebook, basic POS)
- **Decision Maker**: Yes — budget and tool approval

### Goals
1. Reduce customer walkaway rate during peak hours
2. Get visibility into wait times and customer flow across branches
3. Appear modern and professional to customers
4. Reduce staff overhead in managing queues

### Frustrations
1. "I don't know how many customers we lose because the wait looks too long"
2. "My staff wastes time managing the paper waitlist"
3. "I can't compare performance between branches"
4. "Customers call to ask about wait times — it interrupts service"

### Needs from ServiceOS
- Quick setup (< 10 min to first queue)
- Dashboard showing both branches
- QR code to print and place at entrance
- Daily summary of queue metrics
- Affordable pricing for SMB

### Acceptance Criteria
- Can set up a branch and create first queue in under 10 minutes
- Can view cross-branch dashboard
- Can generate QR code without technical help

---

## Persona 2: Branch Manager — "Ploy"

### Demographics
- **Role**: Clinic branch manager
- **Age**: 28-40
- **Tech Comfort**: High (manages social media, uses spreadsheets)
- **Decision Maker**: Operational decisions only

### Goals
1. Ensure smooth patient flow through all stages
2. Minimize wait times at each stage
3. Assign staff efficiently based on demand
4. Report daily metrics to owner

### Frustrations
1. "I can't see which stage is the bottleneck today"
2. "Patients complain they don't know what's happening next"
3. "I manually track everything in a spreadsheet"
4. "When a doctor is absent, reassigning patients is chaotic"

### Needs from ServiceOS
- Multi-stage workflow view showing all patients
- Stage-level wait time metrics
- Staff assignment per stage
- Ability to reassign patients across stages
- Daily/weekly reports

### Acceptance Criteria
- Can see all patients across all workflow stages on one screen
- Can reassign a patient to a different doctor
- Can export daily report

---

## Persona 3: Staff Member — "Nong"

### Demographics
- **Role**: Front desk / Counter staff
- **Age**: 22-35
- **Tech Comfort**: High (smartphone native)
- **Decision Maker**: No — executes operations

### Goals
1. Call next customer quickly
2. Know which customers are waiting
3. Handle no-shows without confusion
4. Complete tasks without switching between tools

### Frustrations
1. "Calling queue numbers verbally is embarrassing when it's loud"
2. "I don't know if the customer already left"
3. "The paper list gets messy by afternoon"
4. "I have to use 3 different systems"

### Needs from ServiceOS
- One-tap "Call Next" button
- Clear list of waiting customers
- No-show marking with auto-skip
- Simple, mobile-friendly interface
- Audio/visual notification on display screen

### Acceptance Criteria
- Can call next customer in 1 tap
- Can mark no-show in 1 tap
- Interface works on tablet

---

## Persona 4: Customer — "Mike"

### Demographics
- **Role**: Walk-in customer
- **Age**: 20-60
- **Tech Comfort**: Varies (must work for low-tech users)
- **Decision Maker**: Chooses where to spend money

### Goals
1. Know how long the wait will be before committing
2. Track queue position without asking staff
3. Be notified when it's their turn
4. Not download an app just to join a queue

### Frustrations
1. "I don't know if it's worth waiting"
2. "I sat here for 30 minutes and someone who came after me got served first"
3. "I went to the bathroom and missed my turn"
4. "I don't want to download another app"

### Needs from ServiceOS
- Scan QR → see position (no app install)
- Real-time position updates
- SMS/browser notification when called
- Estimated wait time
- Option to leave and be notified

### Acceptance Criteria
- Can join queue by scanning QR code (< 3 taps)
- Can see live queue position on phone browser
- Gets notified when called

---

## Persona 5: System Administrator — "Earth"

### Demographics
- **Role**: IT administrator for multi-branch chain
- **Age**: 25-40
- **Tech Comfort**: Very high (developer-level)
- **Decision Maker**: Technical decisions

### Goals
1. Ensure system security and uptime
2. Manage user access across branches
3. Configure workflows and integrations
4. Monitor system performance

### Frustrations
1. "I need to manually create accounts for every new staff member"
2. "There's no audit trail when something goes wrong"
3. "I can't restrict what each branch manager can see"
4. "Integration with our existing systems requires custom development"

### Needs from ServiceOS
- RBAC with granular permissions
- Audit logs for all actions
- API access for integrations
- Bulk user management
- System health monitoring

### Acceptance Criteria
- Can create roles with custom permissions
- Can view audit log of all user actions
- Can access REST API for integration

---

## Persona Matrix

| Dimension | Somchai (Owner) | Ploy (Manager) | Nong (Staff) | Mike (Customer) | Earth (Admin) |
|---|---|---|---|---|---|
| Primary Action | Review & Configure | Monitor & Manage | Execute & Process | Wait & Track | Configure & Secure |
| Frequency | Daily review | All day | All day | Per visit | Weekly |
| Device | Phone + Desktop | Desktop/Tablet | Tablet | Phone | Desktop |
| Key Metric | Revenue impact | Wait times | Queue processed | Wait position | System health |
| Complexity Tolerance | Low | Medium | Very Low | Very Low | High |
