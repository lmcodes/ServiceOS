# Multi Tenancy

Strategy:
Shared Firestore database.

Every document must contain:
tenantId

Security:
Users can access only matching tenantId.

Never query cross-tenant data.