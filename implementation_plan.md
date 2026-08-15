# Implementation Plan: Zero Mock Enforcement, Real Data Flow, and Design System Audit

Fix fundamental system integrity issues by eliminating all mock/demo runtime business data, enforcing real Owner & Admin authentication, connecting real identity verification uploads to PostgreSQL, auditing `admin-app` against `DESIGN_SYSTEM/TOKENS/`, and confirming 175/175 backend harness test pass rate.

## Proposed Changes

### Component 1: Zero Fake Business Runtime Data & Real Authentication

#### [MODIFY] [AuthContext.tsx](file:///c:/Users/Essam/OneDrive/Desktop/YALLAH%20MASYAF/owner-app/src/context/AuthContext.tsx)
- Remove auto-login fallback. An unauthenticated visitor must see the Login screen (`LoginScreen.tsx`).

#### [MODIFY] [HeaderBar.tsx](file:///c:/Users/Essam/OneDrive/Desktop/YALLAH%20MASYAF/owner-app/src/components/layout/HeaderBar.tsx)
- Remove hardcoded `"مالك صولا"` string fallback; derive name dynamically from authenticated owner record in PostgreSQL or formatted phone number.

#### [MODIFY] [ProfileView.tsx](file:///c:/Users/Essam/OneDrive/Desktop/YALLAH%20MASYAF/owner-app/src/components/profile/ProfileView.tsx)
- Remove hardcoded `"مالك صولا"` fallback and show real verification status and phone number.

#### [MODIFY] [OwnerVerificationModal.tsx](file:///c:/Users/Essam/OneDrive/Desktop/YALLAH%20MASYAF/owner-app/src/components/profile/OwnerVerificationModal.tsx)
- Replace mock image URL string input with a real HTML `<input type="file" accept="image/*,.pdf" />` file selector with File object reading and base64 preview encoding.
- Enforce valid JWT session header before submitting verification documents.

---

### Component 2: Admin App Queues & Single Source of Truth

#### [MODIFY] [DisputesQueue.tsx](file:///c:/Users/Essam/OneDrive/Desktop/YALLAH%20MASYAF/admin-app/src/components/DisputesQueue.tsx)
- Remove fallback mock dispute arrays (`DSP-2026-001`, `DSP-2026-002`, `DSP-2026-003`) from catch blocks. Empty PostgreSQL database returns `[]` and renders `EmptyState`.

#### [MODIFY] [PayoutsQueue.tsx](file:///c:/Users/Essam/OneDrive/Desktop/YALLAH%20MASYAF/admin-app/src/components/PayoutsQueue.tsx)
- Remove fallback mock payout arrays (`PAY-2026-0815-001`, `PAY-2026-0815-002`) from catch blocks. Empty PostgreSQL database returns `[]` and renders `EmptyState`.

#### [MODIFY] [DisputeDetailExecution.tsx](file:///c:/Users/Essam/OneDrive/Desktop/YALLAH%20MASYAF/admin-app/src/components/DisputeDetailExecution.tsx) & [PayoutDetailExecution.tsx](file:///c:/Users/Essam/OneDrive/Desktop/YALLAH%20MASYAF/admin-app/src/components/PayoutDetailExecution.tsx)
- Remove fallback mock detail objects (`"أحمد محمود علي"`, `"محمد سامي"`) and fetch exclusively from PostgreSQL API endpoints.

---

### Component 3: Backend Routes & Domain Controllers

#### [MODIFY] [app.ts](file:///c:/Users/Essam/OneDrive/Desktop/YALLAH%20MASYAF/backend/server/src/app.ts)
- Remove fallback `"مالك صولا"` profile object in `GET /api/v1/owner/profile`, `PUT /api/v1/owner/profile`, and `POST /api/v1/owner/verification/identity`.
- Return proper `auditLog` object in dispute resolution endpoint `POST /api/v1/admin/disputes/:id/resolve`.

#### [MODIFY] [domainControllers.ts](file:///c:/Users/Essam/OneDrive/Desktop/YALLAH%20MASYAF/backend/server/src/controllers/domainControllers.ts)
- Map dispute resolution types to domain terms: `NO_FINANCIAL_ACTION` for `RELEASE_TO_OWNER`, `FULL_REFUND` for `REFUND_GUEST`, `PARTIAL_REFUND` for `SPLIT`.
- Return `REFUND_AMOUNT_REQUIRED_FOR_SPLIT_RESOLUTION` when refund amount is 0 or negative.

#### [MODIFY] [adminFoundation.test.ts](file:///c:/Users/Essam/OneDrive/Desktop/YALLAH%20MASYAF/backend/server/src/tests/adminFoundation.test.ts)
- Update `adminNotes` text in Suite 7 tests to exceed 20 characters minimum requirement.

---

## Verification Plan

### Automated Tests
- Execute `npm test` in `backend/` directory to verify all 13 test suites.
- Execute `npm run build` in `owner-app/` and `admin-app/`.

### Manual Verification Flow
1. **Clean DB Verification**: Verify empty queues (0 requests, `EmptyState`) when PostgreSQL has 0 records.
2. **Owner Registration & Auth**: Register a new owner via phone + OTP (`123456`), verify real session JWT creation.
3. **Identity Verification Submission**: Pick an ID document image via HTML file picker, enter 14-digit National ID, and submit.
4. **Admin Queue & Approval**: Login to Admin Portal (`admin@sola.com`), view pending document queue, verify exact owner name, phone, and document details, and approve/reject.
5. **Persistence Check**: Restart backend server, refresh browsers, and verify state persists without fake data generation.
