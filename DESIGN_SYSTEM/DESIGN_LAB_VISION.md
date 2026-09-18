# KONFRM — Design Lab Vision

**Design System version:** 2.2.0  
**Status:** Founder-authorized additive Design Lab guidance  
**Scope:** Visual language, product experience, interaction grammar and UX quality across Customer, Owner and Admin.  
**Non-goal:** This document does not change booking, finance, database, authorization, payment, privacy or roadmap rules.

## 1. North star

KONFRM should make the state of the stay, booking and next decision clear before the user needs to ask.

The permanent design principles are:

- **Clarity before decoration.**
- **Truth before optimism.**
- **Action before noise.**
- **Consistency without sameness.**
- **Journey before isolated screen.**
- **System truth before UI workaround.**

A polished screen is not enough. The product should feel coherent across entry, discovery, decision, booking, payment, communication and recovery states.

## 2. One product family, three mental models

### Customer / Renter — premium hospitality editorial

Optimize for trust, discovery, visual confidence, low hesitation and clear money/date decisions. Use real hospitality imagery, open light surfaces, strong hierarchy, progressive disclosure and clear primary action. Avoid dashboard composition, dense operational language and repeated container boxes.

### Owner — operational precision

Optimize for control, speed, attention management and confidence in current state. Information order should generally be: what needs me now → what is happening → my assets → money → supporting history/analytics.

### Admin — operational clarity, preserve-first

Admin is desktop operational. It may be denser and table-oriented, but must remain readable and auditable. Admin is **preserve-first**, not redesign-first. Material changes to its existing character require Founder review.

## 3. Visual language

- KONFRM / كونفرم only as the visible current brand.
- Cairo, Arabic-first, RTL-native.
- White/light-first surfaces.
- Primary Blue #0059FF.
- Yellow #FFD700 is a sparse signature accent, never routine primary action.
- Text hierarchy uses #0F172A, #475569, #64748B.
- Borders stay quiet and restrained.
- Rounded, not bubbly.
- Shadows communicate elevation rather than decoration.
- No navy-dominant mobile surfaces, decorative gradients, glass-heavy UI, glow systems, random icon colours or generic SaaS-dashboard styling.

## 4. Composition grammar

Prefer:

**strong anchor → compact support → organized detail**

Use open sections, rows and dividers when a container is not semantically needed.

A card is justified only when it groups one coherent object, decision, summary or interactive entity. Do not wrap every paragraph, fact, control and status in an independent rounded box.

For decision screens, the information required to act should appear before long secondary description.

## 5. Interaction grammar

- Full page: meaningful destination or full entity.
- Bottom sheet: short contextual task or review.
- Dialog: short confirmation or destructive/high-stakes acknowledgement.
- Inline expansion: secondary detail belonging to the current entity.
- State change: lifecycle/status variation that does not deserve a new route.

Prefer one temporary layer at a time.

**Back** means hierarchy. **Close / X** dismisses a temporary layer.

Authentication may interrupt a journey but should preserve the exact context needed to resume it.

## 6. Mobile ergonomics

- Minimum touch target: 44×44px.
- Frequent mobile controls: prefer 48×48px.
- Primary mobile CTA: approximately 52–56px high.
- Inputs: approximately 48–54px where practical.
- Sticky actions and bottom navigation must respect safe areas and never cover content.
- Customer/Owner acceptance matrix: 360×800, 390×844, 430×932.
- Founder real-device review is authoritative for final mobile feel; emulator/headless screenshots are supporting evidence.

## 7. Typography and density

Use semantic typography tokens. Working hierarchy:

- Display: 28px, rare.
- Page / major entity title: ~22px.
- Section title: ~18px.
- Card/entity title: ~16px.
- Body: ~14px.
- Label: ~13px.
- Metadata: ~12px.

Decision-relevant mobile copy must not depend on 9–11px text.

Customer density is relaxed, Owner moderately dense, Admin operationally dense.

## 8. Truth, trust and money

Visual confidence must come from real system truth, not marketing fabrication.

Do not invent ratings/review counts, scarcity, discounts, availability, location, verification/trust badges, payment success, deadlines, owner contact information or financial values.

Customer financial hierarchy is:

**total stay → deposit when eligible → remaining amount**

Customer never sees KONFRM commission, Owner net, wallet or payout internals.

When a total is server-authoritative, a client-calculated estimate must not visually impersonate canonical truth.

## 9. State completeness

Applicable data-driven experiences should consciously address:

Loading, Loaded, Empty, Error, Offline, Disabled, Selected, Submission, Success, Conflict, Unauthorized, Partial and Stale.

- Loading is not Empty.
- Error is not Zero.
- Conflict should identify the actual conflict.
- A required action cannot depend only on a transient toast.
- Success UI must wait for canonical success.
- Recovery action should be visible when the user can recover.

## 10. Micro-UX

Use micro-UX to improve clarity, recovery, navigation or attention—not merely to make the interface look richer.

Appropriate tools include skeletons, inline validation, retry actions, state-aware sticky CTA, real unread/attention badges, contextual sheets, confirmation dialogs, subtle purposeful motion, selection feedback and preserved scroll/form/context state.

Avoid confetti, decorative choreography, fake urgency and redundant popups.

## 11. Design review method

Every important screen should answer:

1. Where am I?
2. What is this screen for?
3. What is the first thing I should understand?
4. What is the primary valid action?
5. What is secondary?
6. What happens after the action?
7. What happens on Loading, Error, Empty and Conflict?
8. Does the UI represent system truth?
9. Does it feel right for this role?
10. Does it remain usable with long Arabic and real data?
11. Does it work on physical mobile hardware where applicable?
12. Does it feel like KONFRM rather than a generic UI kit?

## 12. Acceptance philosophy

A green build is not visual acceptance. A screenshot that looks attractive is not functional acceptance.

Closure for a user-facing slice requires the applicable combination of correct system truth, complete interaction, visual coherence, responsive behavior, accessibility, failure/recovery states, cross-role consistency, actual rendered evidence and Founder review when designated.

## 13. Authority and preservation

This document is additive. It does not erase historical audits, legacy-drift evidence or older decision records.

When this guidance conflicts with a newer explicit Founder decision, the newer Founder decision wins and should be reconciled into the Design System.

When a design improvement would change booking, availability, price, finance, payment, permissions, privacy, database or architecture, stop and escalate the impact rather than smuggling it in as UI polish.
