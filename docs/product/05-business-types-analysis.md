# ServiceOS — Business Types Analysis

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## 1. Restaurant

### Profile
- **Queue Type**: Walk-in waiting list
- **Workflow Complexity**: Low (2-3 stages)
- **Peak Patterns**: Lunch 11:30-13:30, Dinner 18:00-21:00
- **Avg Wait Time**: 15-45 minutes
- **Key Pain**: Customers leave when wait is unknown

### Workflow
```
WAITING_TABLE → SEATED → COMPLETED
```

### Queue Characteristics
| Attribute | Value |
|---|---|
| Party size tracking | Required |
| Table preference | Indoor/Outdoor/Bar |
| Estimated wait display | Critical |
| SMS "table ready" | High value |
| Walk-in only | Primarily (some reservations) |
| Daily volume | 50-200 parties |

### Unique Requirements
- Party size affects queue priority (table availability matching)
- VIP/Regular customer flagging
- Table turnover time estimation
- Waitlist with estimated time display
- Option to hold position remotely (leave and come back)

### ServiceOS Configuration
| Setting | Value |
|---|---|
| Workflow Template | `restaurant_simple` |
| Custom Fields | `partySize`, `seatingPreference`, `specialRequests` |
| Display Mode | Queue position + estimated wait |
| Notification Trigger | On status → CALLED |

---

## 2. Clinic / Healthcare

### Profile
- **Queue Type**: Registration + multi-step flow
- **Workflow Complexity**: High (5-6 stages)
- **Peak Patterns**: Morning 08:00-11:00
- **Avg Visit Duration**: 30-90 minutes total
- **Key Pain**: Patients don't know where they are in the process

### Workflow
```
REGISTRATION → SCREENING → DOCTOR → PAYMENT → PHARMACY → COMPLETED
```

### Queue Characteristics
| Attribute | Value |
|---|---|
| Appointment + Walk-in | Both |
| Doctor assignment | Required per stage |
| Priority levels | Emergency, Urgent, Normal |
| Insurance verification | Pre-screening step |
| Daily volume | 30-150 patients |
| Multi-resource | Multiple doctors, rooms |

### Unique Requirements
- Appointment + walk-in queue blending
- Priority escalation (emergency bumps queue)
- Doctor/room assignment per stage
- Stage-specific wait times
- Patient can see their progress through all stages
- Prescription/pharmacy integration (future)

### ServiceOS Configuration
| Setting | Value |
|---|---|
| Workflow Template | `clinic_standard` |
| Custom Fields | `appointmentId`, `priority`, `insuranceType`, `symptoms` |
| Display Mode | Current stage + next stage |
| Notification Trigger | On every stage transition |
| Resource Assignment | Doctor per DOCTOR stage, Room per SCREENING |

---

## 3. Salon / Barbershop

### Profile
- **Queue Type**: Service-based with stylist assignment
- **Workflow Complexity**: Low-Medium (3-4 stages)
- **Peak Patterns**: Weekends, evenings
- **Avg Service Time**: 30-120 minutes
- **Key Pain**: Walk-in wait uncertainty, stylist preference

### Workflow
```
WAITING → STYLIST_ASSIGNED → IN_SERVICE → PAYMENT → COMPLETED
```

### Queue Characteristics
| Attribute | Value |
|---|---|
| Service selection | Required (affects duration) |
| Stylist preference | Optional |
| Appointment + Walk-in | Both common |
| Service duration varies | By service type |
| Daily volume | 15-60 customers |

### Unique Requirements
- Service type determines expected duration
- Stylist/barber preference and assignment
- Multiple services per visit (haircut + color)
- Stylist availability/schedule awareness
- Before/after photo capability (future)

### ServiceOS Configuration
| Setting | Value |
|---|---|
| Workflow Template | `salon_standard` |
| Custom Fields | `serviceIds[]`, `preferredStylist`, `notes` |
| Display Mode | Position + estimated time |
| Notification Trigger | On CALLED + COMPLETED |
| Resource Assignment | Stylist per IN_SERVICE stage |

---

## 4. Repair Shop

### Profile
- **Queue Type**: Drop-off + multi-day tracking
- **Workflow Complexity**: Medium-High (4-5 stages)
- **Peak Patterns**: Monday mornings, weekdays
- **Avg Turnaround**: 1-7 days
- **Key Pain**: Customer doesn't know repair status

### Workflow
```
RECEIVED → DIAGNOSIS → AWAITING_APPROVAL → REPAIR → QUALITY_CHECK → READY_PICKUP → COMPLETED
```

### Queue Characteristics
| Attribute | Value |
|---|---|
| Multi-day tracking | Required |
| Status updates | Critical (customer checks remotely) |
| Approval gate | Customer must approve quote |
| Item tracking | Device/vehicle identification |
| Daily intake | 5-30 items |
| Photo documentation | Diagnosis evidence |

### Unique Requirements
- Long-running queue items (days, not minutes)
- Customer approval gate before repair begins
- Cost estimation at diagnosis stage
- Photo/document attachment per stage
- SMS/email status update on every transition
- Pickup scheduling

### ServiceOS Configuration
| Setting | Value |
|---|---|
| Workflow Template | `repair_standard` |
| Custom Fields | `itemDescription`, `serialNumber`, `estimatedCost`, `approvalStatus` |
| Display Mode | Status tracker (not position-based) |
| Notification Trigger | Every stage transition + approval request |
| Time Unit | Days (not minutes) |

---

## 5. Service Center (Government / Utility / Bank)

### Profile
- **Queue Type**: Counter-based service queue
- **Workflow Complexity**: Medium (3-4 stages)
- **Peak Patterns**: Opening hours, month-end
- **Avg Service Time**: 10-30 minutes
- **Key Pain**: Long waits, no visibility, multiple counters

### Workflow
```
TICKET_ISSUED → COUNTER_ASSIGNED → SERVING → COMPLETED
```

### Queue Characteristics
| Attribute | Value |
|---|---|
| Service categorization | Required (determines counter) |
| Multiple counters | Required |
| Counter assignment | Auto or manual |
| Priority queue | Elderly, disabled, VIP |
| Daily volume | 100-500+ |
| Peak handling | Critical |

### Unique Requirements
- Multiple service types → different counters
- Counter-based display (Counter 5 → Ticket A042)
- Auto-routing to available counter
- Priority lanes (elderly, disabled, VIP)
- Token/ticket number generation
- Audio/visual calling system for display

### ServiceOS Configuration
| Setting | Value |
|---|---|
| Workflow Template | `service_center` |
| Custom Fields | `serviceCategory`, `counterNumber`, `priorityLevel` |
| Display Mode | Counter-based calling display |
| Notification Trigger | On COUNTER_ASSIGNED |
| Auto-Assignment | Route to least-busy counter |

---

## 6. Cross-Business Comparison

| Feature | Restaurant | Clinic | Salon | Repair | Service Center |
|---|---|---|---|---|---|
| Queue Duration | Minutes | Hours | Hours | Days | Minutes |
| Workflow Stages | 2-3 | 5-6 | 3-4 | 5-7 | 3-4 |
| Appointments | Rare | Common | Common | N/A | Rare |
| Resource Assignment | Table | Doctor/Room | Stylist | Technician | Counter |
| Priority Levels | VIP only | Emergency | None | Urgent | Elderly/VIP |
| Customer Portal | Low need | High need | Medium | High need | Low |
| Notification Need | Medium | High | Medium | Critical | Low |
| Display Type | Wait list | Stage progress | Wait list | Status tracker | Counter call |
| Multi-day | No | No | No | Yes | No |
| Volume/Day | 50-200 | 30-150 | 15-60 | 5-30 | 100-500 |
