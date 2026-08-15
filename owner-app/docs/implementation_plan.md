# IMPLEMENTATION PLAN: 3 SEPARATE INDEPENDENT APPLICATIONS

Correction accepted. The unified mode switcher architecture is being replaced with **3 strictly separated, independent frontend applications** sharing the robust Express & PostgreSQL backend.

---

## 🏛️ Target Architecture (3 Standalone Applications)

```text
                               ┌──────────────────────────┐
                               │ Express Backend API      │
                               │ Port: 4000 | PostgreSQL  │
                               └────────────▲─────────────┘
                                            │
           ┌────────────────────────────────┼────────────────────────────────┐
           │                                │                                │
┌──────────┴─────────────┐        ┌─────────┴──────────────┐        ┌────────┴───────────────┐
│ 1. SOLA OWNER APP      │        │ 2. SOLA CUSTOMER APP   │        │ 3. SOLA ADMIN APP      │
│ Entry: owner.html      │        │ Entry: customer.html   │        │ Entry: admin.html      │
│ App: OwnerApp.tsx      │        │ App: CustomerApp.tsx   │        │ App: AdminApp.tsx      │
│ Role: ROLE_OWNER       │        │ Role: ROLE_CUSTOMER    │        │ Role: ROLE_ADMIN       │
└────────────────────────┘        └────────────────────────┘        └────────────────────────┘
```

---

## 🚨 Non-Negotiable Invariants

- **Zero Backend Mutation**: 123/123 Automated Tests, 21 Business Rules, 5 State Machines, Financial Engine, and `database/schema.sql` remain **100% FROZEN**.
- **Complete Code Separation**: No mode switchers, no shared state cross-contamination between roles in the frontend code.
- **Strict Role Isolation**:
  - `SOLA OWNER APP`: Accesses ONLY `/api/v1/owner/*` (Blocked from Admin/Customer).
  - `SOLA CUSTOMER APP`: Accesses ONLY `/api/v1/customer/*` (Blocked from Owner/Admin).
  - `SOLA ADMIN APP`: Accesses ONLY `/api/v1/admin/*` (Blocked from Owner/Customer).

---

## 🛠️ Proposed Changes

### Component 1: Build & Entry Point Isolation (`vite.config.ts`)

#### [MODIFY] [`vite.config.ts`](file:///c:/Users/Essam/OneDrive/Desktop/YALLAH%20MASYAF/vite.config.ts)
- Configure Rollup multi-page inputs: `owner`, `customer`, `admin`.
- Enable dedicated dev server entry routes (`/owner.html`, `/customer.html`, `/admin.html`).

#### [NEW] `owner.html` & [`src/owner.tsx`](file:///c:/Users/Essam/OneDrive/Desktop/YALLAH%20MASYAF/src/owner.tsx)
- Dedicated HTML & React entry point for **Sola Owner App**.

#### [NEW] `customer.html` & [`src/customer.tsx`](file:///c:/Users/Essam/OneDrive/Desktop/YALLAH%20MASYAF/src/customer.tsx)
- Dedicated HTML & React entry point for **Sola Customer App**.

#### [NEW] `admin.html` & [`src/admin.tsx`](file:///c:/Users/Essam/OneDrive/Desktop/YALLAH%20MASYAF/src/admin.tsx)
- Dedicated HTML & React entry point for **Sola Admin App**.

---

### Component 2: Separate Application Bundles

#### [NEW] `src/apps/owner/OwnerApp.tsx`
- Clean standalone **Owner App** (Dashboard, Properties, Bookings, Wallet, Calendar, Disputes, Profile).
- Removes all Customer Mode code/switchers.

#### [NEW] `src/apps/customer/CustomerApp.tsx`
- Clean standalone **Customer App** (Discover, Property Details, Checkout, My Bookings, Messages, Disputes).
- Removes all Owner Mode code/switchers.

#### [NEW] `src/apps/admin/AdminApp.tsx`
- Clean standalone **Admin App** UI connecting to `/api/v1/admin/*`:
  - **Document Review**: Approve/reject owner ID & deed documents.
  - **Property Review**: Inspect submitted properties & publish/reject with notes.
  - **Payout Processing**: Complete payout requests with provider transaction IDs.
  - **Dispute Resolution**: Resolve financial disputes (refund guest, release to owner, or split).
  - **Audit Log Inspector**: Audit trail viewer for all admin operations.

---

## 🧪 Verification Plan

### Automated Tests
1. `npx tsc --noEmit` -> Must return **0 Errors**.
2. `npx tsx server/src/tests/runTests.ts` -> All **123/123 Tests MUST PASS**.
3. `npm run build` -> Must produce 3 standalone HTML bundles (`dist/owner.html`, `dist/customer.html`, `dist/admin.html`).

### Manual & E2E Verification
- Open `http://localhost:5173/owner.html` -> Verify Owner App operates independently.
- Open `http://localhost:5173/customer.html` -> Verify Customer App operates independently.
- Open `http://localhost:5173/admin.html` -> Verify Admin App operates independently and executes real document approvals, property publishing, payout processing, and dispute resolutions over HTTP socket.
