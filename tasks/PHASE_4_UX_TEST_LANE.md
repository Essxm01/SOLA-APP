# KONFRM — Phase 4 UX Test Lane Specification

**TASK_ID:** `PHASE_4_UX_TEST_LANE`  
**STATUS:** `LIVE_PROVISIONED_READY`  
**BASELINE_SHA:** `6455ac2f7db02a8c21dd3d2d1ad5e29b7949ad31`  
**PURPOSE:** Durable, isolated, real-behavior test lane for UI/UX evaluation across Customer, Owner, and Admin surfaces without using Founder/personal accounts and without exposing credentials.

---

## 1. Architectural Principles

1. **Zero QA Backdoors:** No bypass query parameters, mock switches, master passwords, or backdoor endpoints exist. All interactions traverse canonical production routes and authentication mechanisms.
2. **Credential Isolation:** Plaintext credentials, tokens, and hashes are strictly forbidden from git repository files, agent transcripts, and public environments. They are stored locally in Windows Credential Manager under the `KONFRM/UXTL/P4/*` target hierarchy.
3. **Strict State Isolation:** Provisioning was verified against a pre-flight database snapshot with zero drift on existing records:
   - Founder admin (`admin@sola.com`) was untouched.
   - Pre-existing user and owner accounts were untouched.
   - Pre-existing properties and bookings were untouched.
4. **Local Manifest Storage:** Fixture identifiers and non-secret metadata are tracked in `%LOCALAPPDATA%\KONFRM\ux-test-lane\phase4\manifest.json`.

---

## 2. Test Identities

| Identity | Canonical Role | Identifier | Contact / Auth Method | WCM Target |
| :--- | :--- | :--- | :--- | :--- |
| **`P4_UX_CUSTOMER`** | `ROLE_CUSTOMER` | `5713fd5f-dc7d-41cc-ba64-40b14d806838` | Canonical OTP-free prototype direct login; identifier stored locally | `KONFRM/UXTL/P4/CUSTOMER` |
| **`P4_UX_OWNER`** | `ROLE_OWNER` | `04945fea-2747-4ce3-852b-fda3eb7749f8` | Canonical OTP-free prototype direct login; identifier stored locally | `KONFRM/UXTL/P4/OWNER` |
| **`P4_UX_ADMIN`** | `ROLE_ADMIN` | `1d46650c-37a2-4515-9aff-2b66754fafed` | Synthetic Admin identifier stored locally in Windows Credential Manager / bootstrap tooling | `KONFRM/UXTL/P4/ADMIN` |

### Invariant & Capability Guarantees
- **Pure Customer Isolation:** `P4_UX_CUSTOMER` has no record in the `owners` table and cannot access owner endpoints (`isOwner: false`).
- **Synthetic Owner Verification:** `P4_UX_OWNER` has `verification_status = 'VERIFIED'` and `owner_onboarding_completed_at = NOW()` configured to allow immediate evaluation of the operational Owner shell without blocking on identity document verification.
- **Admin Truthful Semantics:** `P4_UX_ADMIN` authenticates strictly via `/api/v1/admin/auth/login`. Incorrect credentials return truthful `401 INVALID_ADMIN_CREDENTIALS`.

---

## 3. Fixture Dataset

### Property A (Published & Verified)
- **ID:** `282ca0a5-3627-461e-88a8-f49f30835836`
- **Title:** `[تجربة UX - فاز 4] شاليه بانورامي بإطلالة بحرية - الساحل الشمالي`
- **Unit Type:** `CHALET`
- **Base Price:** `4500 EGP / night`
- **Status:** `PUBLISHED` (`verification_status: VERIFIED`)
- **Media:** Authentic JPEG uploaded to storage bucket and committed to the property record.
- **Availability Block:** Manually blocked for dates `2026-10-15` and `2026-10-16`.

### Property B (Admin Pending Review Queue Fixture)
- **ID:** `2c4a7e3e-8660-4375-b02a-f6b6c8ccde8a`
- **Title:** `[تجربة UX - فاز 4] فيلا تحت المراجعة الإدارية - مارينا`
- **Unit Type:** `VILLA`
- **Base Price:** `9000 EGP / night`
- **Status:** `PENDING_REVIEW` (`verification_status: PENDING_VERIFICATION`)
- **Queue Presence:** Actively visible in `GET /api/v1/admin/properties/pending` for Admin review and approval evaluation.

### Booking Fixture
- **ID:** `91f59160-a154-44fb-9b41-8cbc42172e1e`
- **Booking Number:** `BK-313226`
- **Property:** Property A (`282ca0a5-3627-461e-88a8-f49f30835836`)
- **Customer:** `P4_UX_CUSTOMER`
- **Owner:** `P4_UX_OWNER`
- **Dates:** `2026-10-20` to `2026-10-23` (3 nights)
- **Guests:** 3
- **Status:** `PENDING_OWNER_APPROVAL`
- **Financial State:** Intentionally unexecuted (`financialTransactionExecuted: false`), allowing evaluation of owner acceptance/rejection flows without simulated payment processing.

---

## 4. Local Tooling & Agent Access

All tooling is located in `%LOCALAPPDATA%\KONFRM\ux-test-lane\phase4\`.

### CLI Tool (`p4_lane_tool.ps1`)
Supported operations:
```powershell
# Display overall status, IDs, and fixture summary
powershell -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\KONFRM\ux-test-lane\phase4\p4_lane_tool.ps1" status

# Display identities and masked credentials locally
powershell -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\KONFRM\ux-test-lane\phase4\p4_lane_tool.ps1" show-identities

# Run end-to-end live API verification across all roles & fixtures (in-memory only)
powershell -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\KONFRM\ux-test-lane\phase4\p4_lane_tool.ps1" verify

# Verify session minting in-memory without disk tokens
powershell -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\KONFRM\ux-test-lane\phase4\p4_lane_tool.ps1" reset-sessions

# Dry-run showing which database fixtures belong to this lane
powershell -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\KONFRM\ux-test-lane\phase4\p4_lane_tool.ps1" cleanup-dry-run
```

### UI Bootstrap Tool (`p4_work_bootstrap.ps1`)
For interactive environments (ChatGPT Work, Cloud Browser, LAP Auditing):
- Launches a native Windows WinForms modal (`KONFRM Phase 4 UX Test Lane`).
- Displays synthetic Admin identifier, masked password with reveal toggle, and a 30-second auto-clearing clipboard copy button.
- Displays Customer and Owner credentials for fast, secure onboarding into browser sessions.

### Dedicated Browser Profile
- **Profile Directory:** `%LOCALAPPDATA%\KONFRM\ux-test-lane\phase4\browser-profiles\KONFRM-P4-UX-AUDIT`
- Ensures complete cookie/localStorage separation from personal and Founder sessions.

---

## 5. Agent Operating Guide

### ChatGPT Work / Cloud Browser
1. Launch `p4_work_bootstrap.ps1` locally to retrieve the Admin credentials securely.
2. In the cloud or audit browser, navigate to the Admin portal.
3. Login using the synthetic Admin identifier and test password.
4. Verify the Admin Overview dashboard and navigate to "مراجعة الوحدات" (Property Review Queue) to inspect Property B.

### Codex Desktop & Z Code
1. Read `%LOCALAPPDATA%\KONFRM\ux-test-lane\phase4\manifest.json` for canonical IDs.
2. Execute `p4_lane_tool.ps1 status` or `p4_lane_tool.ps1 verify` to validate environment readiness before and after UI modifications.
3. Persistent browser sessions are managed exclusively inside the dedicated browser profile.

---

## 6. Retention Policy
The Phase 4 UX Test Lane must remain intact and provisioned throughout the entire Phase 4 UI/UX program. It must not be torn down until formal Phase 4 closure is authorized by the Founder.
