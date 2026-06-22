# ServiceOS — Pricing Strategy

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## 1. Pricing Philosophy

1. **Freemium Funnel** — Free tier acquires users; value drives upgrades
2. **Value-Based** — Price based on business value, not cost
3. **Predictable Bills** — Subscription-first; usage add-ons opt-in
4. **No Surprise Costs** — Hard limits on free, soft limits on paid
5. **Fair Growth** — Pricing scales with business growth

---

## 2. Tier Structure

### Free — "Starter Queue"
- 1 Branch, 2 Users, 5 Services, 50 Queue/Day
- QR Queue ✓, Display (branded) ✓
- No Workflow, No Appointments, No Notifications
- 30-day data retention, Community support

### Starter — $29/month
- 3 Branches, 5 Users/Branch, 20 Services, 200 Queue/Day
- Basic Workflow (3 stages), Email notifications
- 90-day retention, Email support (48h)

### Professional — $99/month
- 10 Branches, 15 Users/Branch, Unlimited Services/Queue
- Full Workflow, Appointments, Advanced Analytics
- Email + SMS (500 included), Read-only API
- 1-year retention, Priority support (24h)

### Enterprise — Custom
- Unlimited everything, White-label, SSO/SAML
- Full API + Webhooks, Custom SLA 99.9%
- Dedicated support, Custom contracts

---

## 3. Add-Ons

| Add-On | Price | Available From |
|---|---|---|
| Extra Branch | $15/mo | Starter+ |
| Extra User | $5/mo | All paid |
| SMS Bundle (500) | $20/mo | Starter+ |
| SMS Pay-As-You-Go | $0.05/SMS | Starter+ |
| API Access | $30/mo | Starter |
| Priority Support | $25/mo | Starter |

---

## 4. Billing

- **Annual Discount**: 20% off (Starter: $278/yr, Pro: $950/yr)
- **Proration**: Upgrades prorated mid-cycle
- **Downgrade**: Effective end of billing cycle
- **Grace Period**: 7 days past due before suspension
- **Post-Cancel Retention**: 30 days to export

---

## 5. Competitive Analysis

| Competitor | Price Range | Limitation |
|---|---|---|
| Waitly | $24-59/mo | Queue only, no workflow |
| QLess | $200+/mo | Enterprise only |
| Qmatic | $500+/mo | Hardware-dependent |
| Appointy | $20-80/mo | Appointments only |
| **ServiceOS** | **$0-99/mo** | **Full platform** |

---

## 6. Revenue Projections (12 months, conservative)

| Month | Free | Starter | Pro | Enterprise | MRR |
|---|---|---|---|---|---|
| 3 | 50 | 5 | 1 | 0 | $244 |
| 6 | 150 | 20 | 5 | 1 | $1,275 |
| 12 | 500 | 70 | 25 | 3 | $4,955 |

---

## 7. Limit Enforcement

| Limit Type | Enforcement | UX |
|---|---|---|
| Hard (Free) | Block action | "Upgrade to continue" modal |
| Soft (Paid) | Warning at 80% | In-app banner + email |
| Overage (Paid) | Allow + charge | Invoice next cycle |
