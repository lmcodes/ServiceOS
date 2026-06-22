# ServiceOS — User Journeys

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## Journey 1: Owner — First-Time Setup

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Signup  │───▶│  Create  │───▶│  Setup   │───▶│  Add     │───▶│  Print   │
│  Account │    │  Tenant  │    │  Branch  │    │  Services│    │  QR Code │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │               │               │               │
   Email/          Business        Name,           Service         Download
   Google          Name,Type       Address,        Name,           & Print
   OAuth                          Hours           Duration         QR Poster
                                                                     │
                                                                     ▼
                                                              ┌──────────┐
                                                              │  READY!  │
                                                              │  < 10min │
                                                              └──────────┘
```

### Step-by-Step

| Step | Screen | User Action | System Response | Time |
|---|---|---|---|---|
| 1 | Landing Page | Click "Get Started Free" | Show signup form | — |
| 2 | Signup | Enter email + password / Google | Create auth account | 10s |
| 3 | Tenant Setup | Enter business name, type | Create tenant, assign owner | 15s |
| 4 | Branch Wizard | Enter branch details + hours | Create branch, gen QR | 60s |
| 5 | Service Setup | Add 1-5 services | Create service docs | 60s |
| 6 | QR Preview | Review QR code | Show printable QR poster | 10s |
| 7 | Dashboard | See empty dashboard | Show "Create first queue" CTA | — |
| **Total** | | | | **< 5 min** |

### Emotional Journey
```
Excitement ──▶ Confidence ──▶ Satisfaction ──▶ "That was easy!"
 (signup)       (setup)         (QR ready)
```

---

## Journey 2: Staff — Daily Queue Operations

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Login   │───▶│  View    │───▶│  Call    │───▶│  Serve   │───▶│  Complete│
│          │    │  Queue   │    │  Next    │    │  Customer│    │  / Repeat│
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │                                               │
                     │          ┌──────────┐                         │
                     └──────────│ No-Show  │─────────────────────────┘
                                │ (skip)   │
                                └──────────┘
```

### Step-by-Step

| Step | Action | Taps | Notes |
|---|---|---|---|
| 1 | Open app, login | 2 | Remember me enabled |
| 2 | See today's queue list | 0 | Auto-loaded for assigned branch |
| 3 | Tap "Call Next" | 1 | System selects FIFO |
| 4 | Customer arrives → Tap "Start Serving" | 1 | Timer starts |
| 5a | Done → Tap "Complete" | 1 | Item archived |
| 5b | No show → Tap "No Show" | 1 | Auto-calls next |
| 6 | Repeat step 3-5 all day | — | — |

### Key UX Requirements
- **Maximum 1 tap** for primary actions (Call, Complete, No-Show)
- Queue auto-refreshes (no manual pull-to-refresh)
- Sound notification when new customer joins
- Clear visual distinction between WAITING, CALLED, SERVING states

---

## Journey 3: Customer — QR Queue Join

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Scan    │───▶│  Select  │───▶│  Enter   │───▶│  Wait &  │───▶│  Called! │
│  QR Code │    │  Service │    │  Name    │    │  Track   │    │  Go to   │
│          │    │          │    │          │    │  Position│    │  Counter │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                     │
                                              Live updates:
                                              "Position: 3"
                                              "Est. wait: 12 min"
```

### Step-by-Step

| Step | Action | Device | Notes |
|---|---|---|---|
| 1 | Scan QR poster at entrance | Phone camera | Opens mobile browser |
| 2 | See branch name + queue info | Phone browser | No login required |
| 3 | Select service type | Phone browser | 1 tap |
| 4 | Enter name (phone optional) | Phone browser | 2 fields |
| 5 | Tap "Join Queue" | Phone browser | 1 tap |
| 6 | See queue number + position | Phone browser | Live Firestore updates |
| 7 | Wait (check phone periodically) | Phone browser | Position counts down |
| 8 | Notification: "Your turn!" | Phone browser + SMS | Audio + vibration |
| 9 | Proceed to counter/service | Physical | — |

### Key UX Requirements
- **Total taps to join: 3-4** (select service, enter name, submit)
- **No app download, no login, no signup**
- Page must load in < 2 seconds on 3G
- Position updates in < 2 seconds
- Works on any mobile browser

---

## Journey 4: Clinic Patient — Multi-Step Workflow

```
┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐
│REGISTRATION│──▶│ SCREENING  │──▶│   DOCTOR   │──▶│  PAYMENT   │──▶│  PHARMACY  │──▶│ COMPLETED  │
│            │   │            │   │            │   │            │   │            │   │            │
│ Front desk │   │   Nurse    │   │  Dr. Smith │   │  Cashier   │   │ Pharmacist │   │   Exit     │
│ 5 min      │   │  10 min    │   │  15 min    │   │  5 min     │   │  10 min    │   │            │
└────────────┘   └────────────┘   └────────────┘   └────────────┘   └────────────┘   └────────────┘
      │                │                │                │                │
   Patient          Patient          Patient          Patient          Patient
   sees:            sees:            sees:            sees:            sees:
   "Step 1/5"       "Step 2/5"       "Step 3/5"       "Step 4/5"       "Step 5/5"
   "Screening       "Doctor room     "Proceed to      "Go to           "You're
    next"            204 next"        cashier"         pharmacy"        done!"
```

### Patient Experience at Each Stage
| Stage | Patient Sees | Notification | Wait Type |
|---|---|---|---|
| Registration | "Checked in. Screening is next." | — | Short |
| Screening | "Screening in progress. Doctor next." | "Go to Room 101" | Medium |
| Doctor | "With Dr. Smith. Payment next." | "Go to Room 204" | Longest |
| Payment | "Payment time. Pharmacy next." | "Go to Cashier 2" | Short |
| Pharmacy | "Final step. Almost done!" | "Go to Pharmacy" | Short |
| Completed | "All done! Thank you." | Summary SMS | — |

---

## Journey 5: Repair Shop Customer — Multi-Day Tracking

```
Day 1                          Day 2-3                      Day 3-5
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ DROP-OFF │─▶│DIAGNOSIS │─▶│ APPROVAL │─▶│  REPAIR  │─▶│  READY   │─▶│ PICK UP  │
│          │  │          │  │ (GATE)   │  │          │  │          │  │          │
└──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
     │              │              │              │              │
   Customer       SMS:           SMS:          SMS:           SMS:
   gets           "Diagnosing    "Quote: ฿500  "Repair in    "Ready for
   tracking       your phone"    Approve?"     progress"     pickup!"
   link                          │
                            Customer clicks
                            "Approve" or
                            "Decline" via link
```

### Unique Aspects
- Customer tracks status remotely via unique URL
- Approval gate requires customer action (approve repair quote)
- Updates happen over days, not minutes
- SMS notifications are critical (customer not on premises)

---

## Journey 6: Owner — Analytics Review (Weekly)

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Login   │───▶│  View    │───▶│  Filter  │───▶│  Export   │
│          │    │  Dashboard│   │  by Date │    │  Report   │
│          │    │  Summary │    │  /Branch │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │
              Key Metrics:
              - 847 served this week
              - Avg wait: 14 min
              - No-show: 8%
              - Peak: Tue 11am
              - Busiest branch: Central
```

### Insights Delivered
| Metric | Insight | Action |
|---|---|---|
| Avg Wait Time trending up | "Wait time increased 20% vs last week" | Add staff during peak |
| No-show rate by branch | "Branch A: 12% vs Branch B: 4%" | Investigate Branch A process |
| Peak hours | "Tuesday 11am-1pm is 2x busier than average" | Schedule extra staff |
| Service popularity | "Haircut is 60% of all queues" | Promote other services |
