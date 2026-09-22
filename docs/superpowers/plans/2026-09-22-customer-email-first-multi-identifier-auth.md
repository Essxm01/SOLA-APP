# Customer Email-First / Multi-Identifier Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow Customers to create and access one canonical KONFRM account with either verified EMAIL or verified PHONE, while preserving existing Owner phone requirements and all current Auth V2 security/routing guarantees.

**Architecture:** Keep `user_identifiers` as the canonical login mapping and make `users.phone_number` nullable only at the shared table level so email-only Customer rows can exist. Auth V2 registration becomes method-aware: PHONE creation persists phone + phone verification; EMAIL creation persists email with null phone. Customer DTOs become nullable-phone tolerant; Screen 10 becomes identifier-method agnostic while retaining the approved one-field onboarding UI.

**Tech Stack:** PostgreSQL/Supabase migrations, Node/TypeScript backend, React/TypeScript Customer app, GitHub Actions, Cloudflare Pages/Workers QA preview.

**Spec:** `docs/superpowers/specs/2026-09-22-customer-email-first-multi-identifier-auth.md`

## Global Constraints

- QA first only; never apply the nullable-phone migration to Production without explicit Founder approval.
- Do not merge to `main`.
- One human user_id may have PHONE, EMAIL, or both verified identifiers.
- Never auto-merge users or move identifiers between users.
- No account existence disclosure before OTP verification.
- Continuation tokens stay purpose-bound, memory-only, short-lived, and single-use.
- Owner flows keep phone mandatory at their own service/repository boundary.
- Booking/Favorite resume rules remain unchanged; booking never auto-submits.
- No Screen 03, Owner UI, Admin UI, finance, or unrelated architecture changes.

## Review Focus

- New EMAIL registration must create exactly one user and one EMAIL identifier with no placeholder phone.
- Existing email entered through CREATE_ACCOUNT must authenticate the existing user, not create a duplicate.
- Registration race after OTP verification must resolve to the already-created user.
- Customer profile/session finalization must succeed with `phoneNumber = null`.
- Existing PHONE and Owner registration paths must remain green.

---

### Task 1: Database nullable-phone boundary

**Files:**
- Create: `backend/database/migrations/032_customer_email_first_nullable_phone.sql`
- Test: `backend/server/src/tests/authV2EmailFirst.test.ts`

**Interfaces:**
- Produces: Customer-capable `users.phone_number NULL` schema while preserving existing unique semantics for non-null phones.
- Consumed by: method-aware user creation and Customer DTO reads.

- [ ] Write a failing schema/contract test asserting migration 032 drops only the users.phone_number NOT NULL constraint, records itself in schema_migrations, and does not alter owners.phone_number requirements.
- [ ] Verify RED against current schema/spec.
- [ ] Add migration 032 with `ALTER TABLE public.users ALTER COLUMN phone_number DROP NOT NULL;` plus explicit comments and schema_migrations record; do not touch Production.
- [ ] Run focused backend migration/contract tests GREEN.
- [ ] Commit.

### Task 2: Method-aware canonical Customer creation

**Files:**
- Modify: `backend/server/src/services/authV2Repository.ts`
- Modify: `backend/server/src/services/dbRepository.ts`
- Modify: `backend/server/src/services/authV2Service.ts`
- Modify/Test: `backend/server/src/tests/authV2EmailFirst.test.ts`
- Modify as required: existing Auth V2 tests that encode deferred-email behavior.

**Interfaces:**
- Produces: `IUserRepository.create({ phoneNumber?: string | null, email?: string | null, ... })` and registration completion that accepts PHONE or EMAIL continuation.
- Consumed by: `/api/v2/auth/registration/complete` and Screen 10 client.

- [ ] Add RED tests for EMAIL CREATE_ACCOUNT -> continuation -> completion -> user with null phone + normalized email + EMAIL identifier + canonical tokens.
- [ ] Add RED tests for PHONE creation regression, existing EMAIL account authentication, existing PHONE account authentication, identifier collision/race, and continuation replay.
- [ ] Make repository creation nullable-phone safe without using `ON CONFLICT (phone_number)` for null-email-only creation; retain conflict-safe phone path.
- [ ] Remove the EMAIL-only hard block in `completeAccountCreation`; branch creation by payload.method.
- [ ] For PHONE: keep current phone persistence and `updatePhoneVerified` behavior.
- [ ] For EMAIL: create user with null phone, normalized verified email, no phone verification timestamp, then create EMAIL identifier.
- [ ] Preserve atomic challenge consumption before mutations and existing-race resolution before new user creation.
- [ ] Run focused Auth V2 backend tests GREEN.
- [ ] Commit.

### Task 3: Customer API nullable-phone contract

**Files:**
- Modify: `backend/server/src/contracts/customerRenter.ts`
- Modify/Test: `backend/server/src/tests/p22RenterApiContract.test.ts`
- Modify any narrow Customer DTO typings/serializers that reject null phone.

**Interfaces:**
- Produces: Customer profile/account reads where `phoneNumber` may be null.
- Consumed by: Customer App canonical session finalization after email-only registration.

- [ ] Add RED test for authenticated Customer profile with null phone and verified email.
- [ ] Change only Customer DTO parsing/serialization to accept null phone; do not weaken Owner DTO requirements.
- [ ] Verify profile/account-summary reads remain fail-closed for malformed non-null phone values.
- [ ] Run renter API contract tests GREEN.
- [ ] Commit.

### Task 4: Frontend Auth V2 email registration outcome

**Files:**
- Modify: `customer-app/src/utils/customerAuthV2.ts`
- Modify: `customer-app/src/utils/customerAuthV2Flow.ts`
- Modify: `customer-app/src/components/CustomerAuthScreen09.tsx`
- Test: relevant Screen 09/Auth V2 tests.

**Interfaces:**
- Produces: new-email CREATE_ACCOUNT outcome carrying a continuation token to Screen 10; missing-account LOGIN for either method can offer explicit creation using the already-verified continuation.
- Consumed by: App Screen 10 handoff.

- [ ] Add RED client tests that new EMAIL CREATE_ACCOUNT with continuation is accepted as account-creation continuation instead of `EMAIL_ACCOUNT_CREATION_DEFERRED`.
- [ ] Add RED test that missing EMAIL LOGIN preserves continuation for explicit create-account handoff after verification.
- [ ] Remove the deferred-email terminal behavior from Screen 09.
- [ ] Keep no-pre-verification enumeration behavior unchanged.
- [ ] Run Screen 08/09 tests GREEN.
- [ ] Commit.

### Task 5: Screen 10 supports verified EMAIL and PHONE

**Files:**
- Modify: `customer-app/src/utils/customerAuthV2Flow.ts`
- Modify: `customer-app/src/components/CustomerAuthScreen10.tsx`
- Modify: `customer-app/src/App.tsx`
- Modify/Test: Screen 10 tests/contracts.

**Interfaces:**
- Produces: `Screen10Handoff.method` as `PHONE | EMAIL`, identifier-method-specific subtle context, unchanged registration/finalization orchestration.
- Consumed by: canonical session persistence + origin resume.

- [ ] Add RED tests for EMAIL handoff, masked email display, registration success -> canonical reads -> session persistence -> origin resume.
- [ ] Generalize Screen10Handoff to PHONE | EMAIL without persisting continuation token.
- [ ] Reuse approved Screen 10 copy, field, CTA, retry/back suppression, and layout; display masked email when method EMAIL.
- [ ] Ensure Welcome email creation routes to Explore; Booking returns Review only; Favorite remains scoped.
- [ ] Run Screen 10 + full Customer Auth flow tests GREEN.
- [ ] Commit.

### Task 6: QA migration + end-to-end verification

**Files:**
- No Production mutation.
- QA Supabase project only: `vlowzglqruozxstiqzgn`.

**Interfaces:**
- Consumes all prior tasks.
- Produces verified Founder Preview behavior.

- [ ] Run repository CI on the feature branch/PR and require Customer + Backend success.
- [ ] Apply migration 032 to QA Supabase only after code and migration tests are green.
- [ ] Verify QA schema: users.phone_number nullable; owners.phone_number still required; unique user_identifiers constraint intact.
- [ ] Exercise QA E2E: new email -> OTP -> Screen 10 -> account -> Explore; repeat login by same email -> same user; new phone path unchanged.
- [ ] Confirm no Production DB/Auth/Worker mutation occurred.
- [ ] Publish/use Cloudflare branch Preview only for Founder testing.
- [ ] Record evidence on PR; keep unmerged.
