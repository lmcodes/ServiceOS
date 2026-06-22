# ServiceOS — Tenant Isolation & Security Model

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## 1. Tenant Isolation Model

ServiceOS uses a **Logical Single-Database Multi-Tenancy** strategy. All tenants share the same Firestore instance and collections, but data is separated logically using a required `tenantId` field on every document. 

Isolation is strictly enforced at two levels:
1. **Database Layer**: Firestore Security Rules validate that the authenticated user's `tenantId` custom claim matches the `tenantId` field of any document they attempt to read, write, or query.
2. **Application Layer**: React context providers auto-inject `tenantId` parameters into all database queries, preventing accidental cross-tenant queries.

```
                  ┌──────────────────────────────┐
                  │      Authenticated User      │
                  │   Custom Claim: tenantId     │
                  └──────────────────────────────┘
                                 │
                                 ▼
                     [ Firestore Query Request ]
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │  Firestore Security Rules   │
                  │                              │
                  │   Check:                     │
                  │   auth.token.tenantId ==     │
                  │   resource.data.tenantId     │
                  └──────────────────────────────┘
                      /                      \
                    Yes                      No
                    /                          \
                   ▼                            ▼
          [ Access Granted ]            [ Access Denied ]
```

---

## 2. Data Ownership Model

1. **Tenant Ownership**: The Tenant document owns all child objects (`branches`, `services`, `queues`, `appointments`, etc.). If a Tenant is deleted or suspended, access to all children is revoked.
2. **Customer Data Ownership**: Customer records (names, phone numbers) are processed strictly for queue delivery. Phone numbers are hashed or deleted after data retention expires.
3. **Auditability**: Tenants can request exports of all their data. The database schema supports this by allowing easy queries on `where('tenantId', '==', tenantId)` across all collection indexes.
