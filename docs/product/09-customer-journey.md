# ServiceOS — Customer Journey

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## 1. Customer Lifecycle Stages

```
AWARENESS ──▶ CONSIDERATION ──▶ ACQUISITION ──▶ ACTIVATION ──▶ RETENTION ──▶ EXPANSION ──▶ ADVOCACY
```

---

## 2. Stage Details

### Stage 1: Awareness

| Aspect | Detail |
|---|---|
| **Goal** | Business owner learns ServiceOS exists |
| **Channels** | Google search, social media, word of mouth, partner referrals |
| **Content** | Blog: "How to reduce wait times by 50%", Video demos, Case studies |
| **Key Message** | "Replace paper queues in 10 minutes. Free forever for 1 branch." |
| **Metrics** | Website visits, blog reads, social impressions |

### Stage 2: Consideration

| Aspect | Detail |
|---|---|
| **Goal** | Owner evaluates ServiceOS vs alternatives |
| **Touchpoints** | Pricing page, feature comparison, demo video, free trial |
| **Decision Factors** | Price, ease of setup, business type fit, no hardware needed |
| **Objections** | "Is it reliable?", "Will my staff use it?", "What if internet is down?" |
| **Counter-Objections** | 99.9% uptime, 1-tap staff interface, offline graceful degradation |
| **Metrics** | Pricing page views, signup page visits, demo video completions |

### Stage 3: Acquisition (Signup)

| Aspect | Detail |
|---|---|
| **Goal** | Owner creates account |
| **Flow** | Landing → Signup → Email verify → Tenant creation |
| **Time** | < 2 minutes |
| **Friction Points** | Email verification, form fields |
| **Optimization** | Google OAuth (1-click), minimal required fields |
| **Metrics** | Signup conversion rate, time to signup, signup method split |

### Stage 4: Activation (First Value)

| Aspect | Detail |
|---|---|
| **Goal** | Owner creates first branch and processes first queue item |
| **Definition of Activated** | ≥ 1 queue item completed within 7 days of signup |
| **Flow** | Setup wizard → Branch → Services → QR → First queue |
| **Time** | < 10 minutes to setup, < 24 hours to first queue |
| **Risks** | Owner gets lost in setup, doesn't print QR, staff not trained |
| **Mitigations** | Guided wizard, sample data, "Quick Start" checklist, video tutorial |
| **Metrics** | Activation rate, time to first queue, setup completion rate |

### Activation Checklist (shown in-app)
```
□ Create your business account         ✓
□ Set up your first branch             ✓
□ Add at least one service             ✓
□ Print your QR code                   □
□ Create your first queue item         □
□ Open queue display on a screen       □
── Congratulations! You're activated! ──
```

### Stage 5: Retention

| Aspect | Detail |
|---|---|
| **Goal** | Owner uses ServiceOS daily as core operations tool |
| **Key Metrics** | DAU/MAU ratio, queue items/day, login frequency |
| **Health Indicators** | Daily queue usage, multiple staff logins, display active |
| **Risk Indicators** | No login for 3+ days, queue volume declining, single user only |
| **Retention Tactics** | Weekly summary email, "You served 234 customers this week!" |
| **Engagement Hooks** | Analytics insights, "Try workflow engine", streak tracking |
| **Metrics** | 30-day retention, 90-day retention, daily active rate |

### Stage 6: Expansion (Upgrade)

| Aspect | Detail |
|---|---|
| **Goal** | Free user upgrades to paid, paid user upgrades tier or adds branches |
| **Upgrade Triggers** | Hit queue limit, need 2nd branch, want workflow, want SMS |
| **Expansion Revenue** | Add-on branches, add-on users, SMS bundles |
| **Approach** | Value-based nudges, not hard sells |
| **Messaging** | "You've served 48/50 queues today. Upgrade for unlimited." |
| **Metrics** | Free-to-paid conversion, upgrade rate, expansion MRR |

### Stage 7: Advocacy

| Aspect | Detail |
|---|---|
| **Goal** | Happy customers refer other businesses |
| **Program** | Referral program: 1 month free for both parties |
| **Channels** | In-app referral link, email invite, social share |
| **Social Proof** | "Trusted by 500+ businesses", testimonials, case studies |
| **Metrics** | NPS score, referral rate, reviews posted |

---

## 3. Customer Journey Map — Owner (Somchai)

| Phase | Doing | Thinking | Feeling | Touchpoint | Opportunity |
|---|---|---|---|---|---|
| Awareness | Googles "digital queue system" | "There must be a better way" | Frustrated | Google, Blog | SEO content |
| Consideration | Compares 3 tools | "Is this worth the effort?" | Cautious | Pricing page | Free tier removes risk |
| Signup | Creates account | "Let me try this quickly" | Curious | Signup form | Google OAuth = 1 click |
| Setup | Follows wizard | "This is easier than expected" | Pleasantly surprised | Setup wizard | Guided, fast |
| First Queue | Creates test queue | "It actually works!" | Excited | Queue panel | Instant gratification |
| First Day Live | Staff uses it with real customers | "Will customers like it?" | Nervous | QR + Display | Customer positive reaction |
| Week 1 | Checks analytics | "I can see the data!" | Impressed | Dashboard | Weekly summary email |
| Month 1 | Hits free tier limit | "I need more capacity" | Ready to invest | Upgrade prompt | Smooth upgrade flow |
| Month 3 | Considers 2nd branch | "Let me expand" | Confident | Add branch | Branch setup in 5 min |
| Month 6 | Tells friend about ServiceOS | "You should try this" | Proud | Referral link | Referral reward |

---

## 4. Customer Journey Map — End Customer (Mike)

| Phase | Doing | Thinking | Feeling | Touchpoint |
|---|---|---|---|---|
| Arrival | Walks into restaurant | "How long is the wait?" | Uncertain | Physical entrance |
| Discovery | Sees QR poster | "Let me scan this" | Curious | QR poster |
| Join | Scans, enters name, joins | "That was fast" | Pleased | Mobile browser |
| Waiting | Checks phone for position | "3 more ahead of me" | Informed, calm | Live tracking page |
| Called | Gets notification | "My turn!" | Excited | Browser push / SMS |
| Service | Gets served | "Smooth experience" | Satisfied | Physical service |
| Post-Service | Leaves | "That was organized" | Impressed | — |
| Return | Comes back next time | "I know the drill" | Comfortable | QR scan (faster) |

---

## 5. Churn Prevention Touchpoints

| Signal | Trigger | Action |
|---|---|---|
| No login 3 days | Automated check | Email: "Your queue is waiting for you" |
| No login 7 days | Automated check | Email: "Need help getting started?" with video |
| No login 14 days | Automated check | Email: "We miss you" with special offer |
| Queue volume dropping | Week-over-week decline > 30% | In-app survey: "How can we improve?" |
| Payment failed | Stripe webhook | Email + in-app: "Update payment method" |
| Downgrade request | User action | Exit survey + offer (e.g., 1 month at current tier free) |

---

## 6. Success Metrics by Stage

| Stage | Metric | Target |
|---|---|---|
| Awareness | Monthly website visits | 10,000+ (month 6) |
| Consideration | Signup page visit rate | 30% of visitors |
| Acquisition | Signup conversion rate | 15% of signup page visitors |
| Activation | 7-day activation rate | 60% of signups |
| Retention | 30-day retention | 70% |
| Retention | 90-day retention | 50% |
| Expansion | Free-to-paid conversion | 15% |
| Advocacy | NPS | > 50 |
| Advocacy | Referral rate | 10% of paying customers |
