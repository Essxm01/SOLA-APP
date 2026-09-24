# KONFRM — Screen 03 Explore / Home — Living Product & Execution Spec

**Document role:** Canonical living file for Customer Screen 03 (Explore / Home).  
**Status:** HIGH-PRIORITY / EVOLVING / NOT FROZEN / IMPLEMENTATION DEFERRED.  
**Product owner:** Founder.  
**Primary review loop:** Founder ↔ LAB ↔ Bridge.  
**Execution gate:** Do not start implementation until the Founder finishes the current LAB discussions and the Bridge performs SCREEN_03_FINAL_CONSOLIDATION immediately before Screen 08.  
**Implementation executor later:** Codex or Z Code through one consolidated Mega Prompt.  
**Repository:** Essxm01/SOLA-APP.  
**Repository main at this file publication:** edb000f0ead55e5e0d3b00b546b645a62229dc33. This SHA is evidence only; re-check latest main before any later execution.

---

## 1. Why this file exists

Screen 03 is one of the most important product surfaces in KONFRM and is expected to evolve repeatedly.

This is not a one-time frozen mockup. This file exists to:

- collect every Founder/LAB decision for Screen 03,
- preserve context between conversations,
- record superseded decisions instead of silently forgetting them,
- prevent Codex/Z Code from acting on stale or fragmented instructions,
- allow the Bridge to produce one final consolidated execution command when implementation time arrives.

Screen 03 must be treated as a **Living Product Surface**.

---

## 2. Authority order

If two Screen 03 instructions conflict, use this order:

1. Latest explicit Founder decision.
2. Latest Founder-approved LAB decision or dated Screen 03 override.
3. This living file after Bridge reconciliation.
4. KONFRM Master Project Context / Master Rules / approved Design System.
5. Verified current implementation behavior.
6. Current code/tests as implementation evidence only.
7. Older specs, prototypes, screenshots, comments, mocks, TODOs.

Existing code never overrides a newer Founder product/design decision.

---

## 3. Screen role

Screen 03 is Customer **Explore / Home**.

Its job is discovery, not dashboard behavior.

The Customer should be able to understand quickly:

- where to explore,
- what real properties are available,
- what each property is,
- where it is,
- the truthful nightly price,
- the basic capacity/facts that matter,
- how to save a property,
- how to move into Search & Refine,
- how to open Property Details.

The experience should communicate:

**Trust + clarity + real data + low hesitation + premium hospitality calm.**

Screen 03 must not feel like:

- a noisy marketplace catalog,
- ecommerce tiles,
- a dashboard,
- generic SaaS,
- promo-heavy inventory.

---

## 4. Global KONFRM visual rules for Screen 03

- Arabic-first, RTL.
- Cairo typography.
- Light-first.
- White / very light neutral dominant surfaces.
- KONFRM Blue: #0059FF.
- Yellow #FFD700 only as a restrained accent when specifically justified.
- No standard dark/navy product surfaces.
- No default gradients.
- No default glassmorphism.
- No decorative noise.
- Minimum touch target 44px.
- Frequent controls preferably around 48px.
- Mandatory mobile QA widths: 360×800, 390×844, 430×932.
- Constrained-height checks when relevant.
- Founder real-device review is stronger final visual evidence than emulator/headless screenshots.
- Green Build/CI is not visual acceptance.
- Screenshot alone is not functional acceptance.

---

## 5. Current known Explore baseline

Future Screen 03 work should preserve the current high-quality implementation unless a newer Founder/LAB decision supersedes it.

### 5.1 Header

Current direction:

- compact white Customer header,
- standalone KONFRM mark,
- exactly one account/identity affordance,
- no notifications bell at this stage,
- no extra promotional clutter.

Guest/authenticated identity behavior must follow the latest Customer header authority at execution time.

### 5.2 Hero

Current approved headline:

**هتصيف فين؟**

Current direction:

- no emoji,
- no replacement subtitle,
- direct visual flow from headline to search.

### 5.3 Search entry

Screen 03 hands off to Screen 04 Search & Refine.

Current default search copy includes:

- إلى أين تريد الذهاب؟
- الوجهة · التواريخ · الضيوف

Do not redesign search unnecessarily while working on unrelated Screen 03 changes.

### 5.4 Discovery section

Current section title:

**اكتشف الإقامات**

Result count is truthful and shown only after successful property loading when results exist.

Current Arabic count behavior includes:

- إقامة واحدة
- إقامتان
- X إقامات

Do not fabricate counts and do not show them during loading.

### 5.5 Public property truth

Explore must use canonical server truth only.

Public property eligibility remains:

- PUBLISHED
- VERIFIED

Never fabricate:

- inventory,
- availability,
- images,
- prices,
- ratings,
- trust claims,
- scarcity.

### 5.6 Current rich PropertyCard

The existing Customer PropertyCard is the rich/reference card shared by:

- Explore,
- Search Results,
- Favorites.

Current approved anatomy:

- real image or truthful neutral fallback,
- strong image presentation,
- title before location,
- canonical location only,
- compact truthful facts,
- nightly price,
- independent Favorite action,
- card opens Property Details,
- Favorite is a sibling control, never a nested button,
- Favorite pending state is visible,
- broken image falls back gracefully.

Current rich-card direction:

- media ratio around 1.4:1,
- title max 2 lines,
- location omitted when absent,
- facts only when real and >0,
- price includes ج.م and / ليلة,
- no redundant السعر في الليلة label.

### 5.7 Explore states

Truthful states required:

- Loading / Skeleton,
- Success,
- Empty,
- Error,
- Retry.

Current empty direction:

- لسه مفيش إقامات هنا
- جرّب مرة تانية لاحقًا.

Current error direction:

- تعذر تحميل الإقامات
- visible retry action.

Generic Explore empty state must not imply date availability.

### 5.8 Bottom navigation

Customer bottom navigation remains:

- استكشف
- المفضلة
- حجوزاتي
- الحساب

Explore content must not be hidden behind fixed bottom navigation.

---

## 6. Founder-approved decision — List / Grid presentation modes

**Decision state:** Approved product direction. Implementation deferred until final Screen 03 consolidation.

Screen 03 will support two user-selectable presentation modes.

### 6.1 Default

**Single-column LIST**

- default mode,
- calmer,
- more editorial,
- richer evaluation,
- best aligned with current premium KONFRM identity.

### 6.2 Optional

**Two-column GRID**

- optional,
- faster browsing,
- more inventory visible,
- still premium and calm,
- must not become catalog-like.

### 6.3 Critical architecture rule

**Do NOT shrink the current PropertyCard into two columns.**

Required:

- LIST uses the current rich PropertyCard.
- GRID uses a dedicated compact hospitality card specifically designed for two columns.

Search Results and Favorites must not automatically inherit Grid.

### 6.4 Toggle placement

The List/Grid control belongs in the discovery section with:

**اكتشف الإقامات**

RTL composition:

- title/section identity on the right,
- compact view toggle on the left.

Do not place it:

- in top header,
- beside logo,
- inside search,
- beside account control,
- in bottom navigation,
- as floating action.

### 6.5 Result count with toggle

Preserve truthful result count.

Preferred hierarchy:

Right:
- اكتشف الإقامات
- muted truthful count beneath/adjacent as support

Left:
- compact List/Grid toggle

### 6.6 Toggle visual direction

- compact,
- minimal,
- visually quiet,
- two-icon segmented control is preferred,
- active state clearly uses KONFRM Blue,
- no heavy container,
- no oversized pill,
- no glass,
- no gradient,
- no dark styling,
- touch-safe even if visible chrome is compact.

Accessibility must expose clear Arabic labels and selected state.

### 6.7 LIST behavior

LIST preserves the richer current PropertyCard experience:

- strong image,
- title,
- location,
- truthful facts,
- nightly price,
- Favorite.

It remains the canonical/reference presentation.

### 6.8 GRID card direction

GRID gets a dedicated compact hospitality card.

Priorities:

1. image-first,
2. fast scanning,
3. less text,
4. calm but clear price,
5. minimal metadata.

Recommended content:

- image,
- Favorite over image,
- title max 2 lines,
- location max 1 line,
- one compact truthful facts line or fewer facts when needed,
- nightly price.

Avoid:

- dense metadata,
- verification badges,
- fake ratings,
- fake scarcity,
- promotional noise,
- catalog density.

### 6.9 Favorite behavior in GRID

GRID Favorite must reuse the exact current Favorite state/business behavior:

- same source of truth,
- same pending state,
- same guest auth interception,
- no duplicate Favorite logic,
- no nested interactive controls.

### 6.10 Context preservation

List ↔ Grid switching is presentation-only.

It must not:

- reset search,
- reset filters,
- reset destination,
- reset results,
- change result order,
- clear Favorites,
- reload the full page,
- trigger an intentional Explore refetch just because mode changed.

Mode should persist during normal navigation where practical.

Preferred persistence:

- local/session presentation preference,
- invalid/missing preference safely falls back to LIST.

### 6.11 Loading / Empty / Error

- LIST keeps the current list skeleton.
- GRID gets a two-column skeleton matching Grid-card geometry.
- Empty and Error remain calm full-width states, not grid cells.

---

## 7. Current superseded/conflict notes

### 7.1 Verification/rating language

Older generic guidance mentioned possible Verified indicator / real rating.

Current Screen 03 direction removed verification badges from cards and rejects fake verification/ratings.

Current rule:

Do not reintroduce rating or verification badge unless a newer explicit Founder/LAB decision adds them.

### 7.2 Current code is not permanent design authority

Current implementation is the regression baseline and reference, not a permanent product decision.

Newer Founder/LAB decisions can supersede it.

### 7.3 Stale tests/specs

Before implementation the Bridge must compare:

- this living file,
- latest LAB output,
- latest Founder decisions,
- current repository,
- current Design System,
- current tests.

A stale source-inspection test that encodes an older Founder decision should be updated truthfully instead of treated as product authority.

---

## 8. Non-negotiable product truth

- Explore remains public where browse rules allow.
- Protected actions such as Favorite may trigger authentication.
- Public discovery itself must not be blocked by auth.
- Auth must preserve interrupted-action context.
- No fake property data.
- No fake image presented as actual property.
- No fake price.
- No fake rating.
- No fake verification claim.
- No fake availability/scarcity.
- Public eligibility is server-authoritative.
- Authenticated Favorites remain server-authoritative.
- Property Details remains the next evaluation surface.
- Changing view mode never creates a booking or business mutation.

---

## 9. Scope boundaries

Screen 03 visual work must not silently change:

- Backend architecture,
- database schema,
- migrations,
- booking lifecycle,
- payment/commission rules,
- availability rules,
- Owner app,
- Admin app,
- Auth V2 architecture,
- Screen 04 product rules,
- Screen 05 product rules,
- Screen 06 data/business truth,
- Screen 07 booking-review behavior.

If a Screen 03 requirement genuinely requires backend/product changes, surface it to the Founder instead of inventing a solution.

---

## 10. Living-spec update protocol

Every new Screen 03 Founder/LAB instruction must be classified as:

### ADD
New requirement that does not conflict.

### REFINE
Improves an existing requirement without changing its core intent.

### SUPERSEDE
Newer decision replaces an older decision.

Keep the old decision visible in history but clearly mark it superseded.

### CONFLICT
New instruction materially contradicts another still-active instruction and cannot be reconciled safely without Founder choice.

Do not implement unresolved conflicts.

---

## 11. Decision Ledger

| Date | Source | Area | Type | Decision | Supersedes | Status |
|---|---|---|---|---|---|---|
| 2026-09-20 | Founder | Screen governance | ADD | Screen 03 is the highest-priority evolving discovery surface and may receive frequent updates. | — | ACTIVE |
| 2026-09-20 | Founder | Execution timing | ADD | Do not execute Screen 03 work now; defer until immediately before Screen 08. | — | ACTIVE |
| 2026-09-20 | Founder | LAB workflow | ADD | Founder will continue discussing Screen 03 with LAB and return with updated/final decisions. | — | ACTIVE |
| 2026-09-20 | Founder | View presentation | ADD | Keep current list and add optional two-column grid. Default remains single-column list. | — | ACTIVE |
| 2026-09-20 | Founder | Grid architecture | ADD | Grid must use a dedicated compact card, not a shrunken PropertyCard. | — | ACTIVE |
| 2026-09-20 | Founder | Toggle placement | ADD | Toggle belongs in the اكتشف الإقامات section row; title right, toggle left. | — | ACTIVE |
| 2026-09-20 | Founder | Context preservation | ADD | View switching preserves search/filter/results context and avoids full reload. | — | ACTIVE |

Future updates must be appended. Never delete prior rows; mark older rows SUPERSEDED when appropriate.

---

## 12. Pending LAB / Founder areas — NOT FROZEN

These remain open and may change materially:

- overall Screen 03 composition,
- final header details,
- hero proportions and spacing,
- destination discovery/chips,
- search-entry treatment,
- discovery-section hierarchy,
- exact List/Grid toggle visuals,
- Grid card proportions,
- Grid image ratio,
- Grid typography,
- Grid facts density,
- card spacing/gaps,
- result-count placement,
- Favorite affordance polish,
- loading skeleton language,
- empty/error treatment,
- micro-interactions,
- scrolling behavior,
- short/tall device rhythm,
- any additional discovery modules later approved by Founder/LAB.

Do not infer final answers for these areas until the Founder freezes them.

---

## 13. Approved timing — before Screen 08

Screen 03 implementation is intentionally deferred.

Sequence:

1. Continue Auth V2 work.
2. Close Remote QA/Auth backend gate.
3. STOP before Screen 08 implementation.
4. Gather every accumulated Founder/LAB Screen 03 decision.
5. Run SCREEN_03_FINAL_CONSOLIDATION.
6. Resolve every ADD / REFINE / SUPERSEDE / CONFLICT.
7. Produce one frozen execution spec for that implementation pass.
8. Produce one long Mega Prompt for Codex or Z Code.
9. Implement Screen 03.
10. Run functional + responsive + visual QA.
11. Prepare LAB visual-review packet.
12. Founder/LAB review.
13. Self-fix in-scope issues.
14. Merge only after acceptance.
15. Then begin Screen 08.

---

## 14. SCREEN_03_FINAL_CONSOLIDATION gate

Before any coding agent receives the implementation task, Bridge must explicitly produce:

### KEEP
What remains unchanged.

### CHANGE
Existing elements to modify.

### ADD
New components/behaviors.

### REMOVE
Current elements explicitly removed by newer decisions.

### DEFER
Discussed ideas not approved for this pass.

### CONFLICT RESOLUTION
Every known old/new conflict and authoritative winner.

### IMPLEMENTATION BOUNDARY
Exact files/systems the coding agent may touch and what it must not touch.

### ACCEPTANCE MATRIX
Functional + visual + responsive + accessibility + regression criteria.

No coding prompt should be sent before this consolidation is complete.

---

## 15. Future coding-agent execution philosophy

At implementation time prefer one long bounded Mega Task instead of many small handoffs:

inspect reality → implement → test → visual QA → self-fix → retest → responsive QA → screenshots → CI → PR → final report

The executor should not return on ordinary CSS/type/test failures.

It should return only when:

- the bounded task is genuinely ready for Bridge/LAB review,
- or a real Founder product decision is required.

The executor may not change product rules, financial rules, backend architecture, or unrelated screens on its own.

---

## 16. Future QA gate

Minimum affected-state review at:

- 360×800
- 390×844
- 430×932

When List/Grid is included:

- LIST screenshot at each required width,
- GRID screenshot at each required width,
- toggle interaction,
- property open/return,
- Favorite action,
- guest Favorite auth interception where safe,
- search handoff/return,
- bottom-tab away/back,
- loading,
- genuine empty,
- error/retry,
- no horizontal overflow,
- no bottom-nav overlap,
- RTL correctness,
- Arabic wrapping,
- touch targets,
- selected-state accessibility,
- no context reset from the presentation toggle.

Screenshots are supporting evidence only. Actual interactions must also be exercised.

---

## 17. Current success definition

Screen 03 should make the Customer feel:

- oriented immediately,
- confident listings are real,
- able to compare without mental overload,
- free to browse using richer LIST or faster GRID,
- never pushed into auth before a protected action,
- never confused by fabricated trust/availability data,
- visually inside the KONFRM identity even if the logo were hidden.

Final quality bar:

**Premium hospitality discovery, Arabic-first, calm, truthful, high-confidence, and flexible without becoming noisy.**

---

## 18. Current document state

SCREEN_03_SPEC_STATE = LIVING  
FOUNDER_UPDATES_EXPECTED = YES  
LAB_DISCUSSION_CONTINUES = YES  
FINAL_SPEC_FROZEN = NO  
IMPLEMENT_NOW = NO  
EXECUTION_POINT = IMMEDIATELY_BEFORE_SCREEN_08  
VIEW_MODE_DIRECTION_APPROVED = YES  
DEFAULT_VIEW = LIST  
OPTIONAL_VIEW = GRID  
GRID_CARD = DEDICATED_VARIANT  
CURRENT_LIST_CARD_MUST_BE_PRESERVED = YES  
BACKEND_PRODUCT_RULE_CHANGES_AUTHORIZED = NO

---

## Update instruction for future conversations

Whenever the Founder sends a new Screen 03 decision:

1. Read this file first.
2. Classify it as ADD / REFINE / SUPERSEDE / CONFLICT.
3. Update the relevant section.
4. Append the Decision Ledger.
5. Do not prematurely freeze the whole Screen.
6. Do not trigger implementation unless the Founder explicitly says the pre-Screen-08 consolidation/execution phase has started.
