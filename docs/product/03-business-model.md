# ServiceOS — Business Model

> Version: 1.0
> Last Updated: 2026-06-22
> Status: Draft

---

## 1. Business Model Canvas

### 1.1 Value Propositions

| Segment | Value Proposition |
|---|---|
| **Single-Branch SMB** | Replace paper queues with a digital system in under 10 minutes. Zero hardware required. |
| **Multi-Branch Chain** | Centralized visibility across all branches with branch-level autonomy. |
| **Customer (End-User)** | Know your queue position in real-time. No more guessing. No app download required. |

### 1.2 Revenue Streams

| Stream | Model | Timeline |
|---|---|---|
| **Subscription (Primary)** | Monthly/annual SaaS tiers | MVP |
| **Usage-Based Add-On** | SMS notifications per message | V2 |
| **Premium Features** | Advanced analytics, API access, webhooks | V3 |
| **White-Label Licensing** | Custom branding package | V4 |
| **Marketplace Commission** | Revenue share on third-party plugins | V5 |

### 1.3 Customer Segments

```
┌─────────────────────────────────────────────────────────┐
│                    Customer Segments                     │
├─────────────────┬───────────────────┬───────────────────┤
│   Solo / Micro  │       SMB         │    Enterprise     │
│   (1 branch)    │   (2-10 branches) │   (10+ branches)  │
│                 │                   │                   │
│  - Salon owner  │  - Clinic chain   │  - Hospital group │
│  - Food stall   │  - Restaurant     │  - Bank network   │
│  - Barber shop  │    chain          │  - Gov offices    │
│                 │  - Repair chain   │                   │
├─────────────────┼───────────────────┼───────────────────┤
│    Free / Basic  │   Professional   │    Enterprise     │
│    $0 - $29/mo  │   $49 - $149/mo  │   Custom pricing  │
└─────────────────┴───────────────────┴───────────────────┘
```

### 1.4 Channels

| Channel | Purpose | Phase |
|---|---|---|
| Website (serviceos.io) | Marketing, signup, documentation | MVP |
| In-App Onboarding | Self-service tenant setup | MVP |
| Content Marketing | SEO blog posts on queue management | Post-MVP |
| Partner Channel | POS/CRM integrations | V3 |
| Referral Program | Tenant referral credits | V2 |

### 1.5 Key Resources

| Resource | Description |
|---|---|
| Firebase Infrastructure | Auth, Firestore, Functions, Hosting |
| Development Team | Frontend + Backend engineers |
| Domain Expertise | Understanding of service business operations |
| Customer Support | Chat/email-based support |

### 1.6 Key Activities

| Activity | Description |
|---|---|
| Platform Development | Core SaaS product engineering |
| Customer Acquisition | Marketing, partnerships, referrals |
| Customer Success | Onboarding, support, retention |
| Data & Analytics | Usage analytics for product decisions |
| Security & Compliance | Continuous security posture management |

### 1.7 Cost Structure

| Cost Center | Type | Estimated Monthly |
|---|---|---|
| Firebase (Firestore) | Variable | $50 - $2,000 |
| Firebase (Functions) | Variable | $20 - $500 |
| Firebase (Auth) | Variable | Free (under 10K users) |
| Firebase (Hosting) | Variable | $10 - $100 |
| SMS Provider (Twilio) | Variable | $0.01 - $0.05 per SMS |
| Domain & SSL | Fixed | $15 |
| Team (Engineering) | Fixed | $5,000 - $30,000 |
| Marketing | Fixed + Variable | $500 - $3,000 |

---

## 2. Revenue Model Deep Dive

### 2.1 Subscription Tiers

| Aspect | Free | Starter | Professional | Enterprise |
|---|---|---|---|---|
| **Price** | $0/mo | $29/mo | $99/mo | Custom |
| **Branches** | 1 | 3 | 10 | Unlimited |
| **Users per Branch** | 2 | 5 | 15 | Unlimited |
| **Queue Items/Day** | 50 | 200 | Unlimited | Unlimited |
| **Services** | 5 | 20 | Unlimited | Unlimited |
| **Queue Display** | ✓ (branded) | ✓ | ✓ (custom) | ✓ (white-label) |
| **QR Queue** | ✓ | ✓ | ✓ | ✓ |
| **Workflow Engine** | — | Basic (3 stages) | Full | Full + Custom |
| **Appointments** | — | — | ✓ | ✓ |
| **Analytics** | Basic | Standard | Advanced | Advanced + Export |
| **Notifications** | — | Email only | Email + SMS | All channels |
| **API Access** | — | — | Read-only | Full CRUD |
| **Support** | Community | Email | Priority Email | Dedicated |
| **SLA** | — | — | 99.5% | 99.9% |
| **Data Retention** | 30 days | 90 days | 1 year | Custom |

### 2.2 Annual Discount

- Annual billing: 20% discount
- Starter Annual: $278/year (saves $70)
- Professional Annual: $950/year (saves $238)

### 2.3 Usage-Based Pricing (Add-Ons)

| Add-On | Price |
|---|---|
| SMS Notifications | $0.05 per SMS |
| Additional Branch | $15/mo per branch |
| Additional User | $5/mo per user |
| API Calls (above tier limit) | $0.001 per call |
| Data Export (above tier limit) | $5 per export |

---

## 3. Unit Economics

### 3.1 Per-Tenant Economics (Professional Tier)

| Metric | Value |
|---|---|
| Monthly Revenue (MRR) | $99 |
| Firebase Cost per Tenant | ~$3-5/mo |
| SMS Cost (avg 200 SMS/mo) | ~$10/mo |
| Support Cost | ~$5/mo |
| **Gross Margin per Tenant** | ~**$79-81/mo (80-82%)** |

### 3.2 Break-Even Analysis

| Scenario | Required Paying Tenants |
|---|---|
| Solo Developer | 15-20 tenants |
| Small Team (3 people) | 60-80 tenants |
| Growth Team (8 people) | 200-250 tenants |

### 3.3 LTV Calculation

- Average monthly churn: 5%
- Average revenue per tenant: $65/mo (blended across tiers)
- **LTV = $65 / 0.05 = $1,300**
- Target CAC: < $130 (LTV:CAC ratio > 10:1)

---

## 4. Go-To-Market Strategy

### 4.1 Launch Strategy

| Phase | Strategy | Timeline |
|---|---|---|
| **Soft Launch** | 10 pilot tenants (free), collect feedback | Month 1-2 |
| **Public Beta** | Free tier open, collect usage data | Month 3-4 |
| **GA Launch** | All tiers live, marketing push | Month 5 |
| **Growth Phase** | Content marketing, partnerships, referrals | Month 6+ |

### 4.2 Customer Acquisition Strategy

1. **Content Marketing**: "How to reduce wait times" blog series, SEO-optimized
2. **Social Proof**: Case studies from pilot tenants
3. **Product-Led Growth**: Free tier as funnel → upgrade when limits hit
4. **Local Partnerships**: POS vendors, business consultants
5. **Referral Program**: 1 month free for referring tenant + referred tenant

### 4.3 Retention Strategy

1. **Onboarding Flow**: Guided setup wizard, sample data
2. **Usage Alerts**: "You processed 180/200 queues today — upgrade for unlimited"
3. **Feature Gating**: Analytics, workflows unlock desire for upgrade
4. **Regular Updates**: Monthly feature releases communicated via in-app + email
5. **Customer Success**: Proactive outreach for Professional+ tiers
