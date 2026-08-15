# 🏛️ SOLA Vacation Rentals — Unified Central Design System

> **Single Source of Truth** for all digital products in the SOLA Vacation Rentals ecosystem (`Owner App`, `Renter App`, `Admin Portal`).
> **Authoritative Visual Reference**: `SOLA Owner App` (Forensic Extraction v1.0.0).

---

## 📐 Architecture Overview

```
                      ┌─────────────────────────────────┐
                      │    SOLA Owner App Codebase      │
                      │  (Authoritative Visual Source)  │
                      └────────────────┬────────────────┘
                                       │
                             Forensic UI/UX Extraction
                                       │
                                       ▼
                      ┌─────────────────────────────────┐
                      │     DESIGN_SYSTEM/ Repository   │
                      │  (Single Source of Truth Tokens)│
                      └────────────────┬────────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          ▼                            ▼                            ▼
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  SOLA Owner App  │         │  SOLA Renter App │         │ SOLA Admin Portal│
│ (Mobile & Web)   │         │ (iOS & Android)  │         │ (Web Application)│
└──────────────────┘         └──────────────────┘         └──────────────────┘
```

---

## 📁 Repository Structure

- [`GOVERNANCE.md`](./GOVERNANCE.md): Governance rules, anti-drift policies, versioning, and change approvals.
- [`AUDIT_REPORT.md`](./AUDIT_REPORT.md): Forensic audit report documenting the extraction process from `owner-app`.
- **`TOKENS/`**: Machine-readable JSON design tokens:
  - [`colors.json`](./TOKENS/colors.json): Brand colors (`#0059FF`, `#FFD700`), surfaces, semantic statuses.
  - [`typography.json`](./TOKENS/typography.json): Cairo font scales, weights, monospace identifiers.
  - [`spacing.json`](./TOKENS/spacing.json): 8pt grid scale and layout padding rules.
  - [`radius.json`](./TOKENS/radius.json): Border radius scales (`16px` cards, `12px` buttons/inputs).
  - [`shadows.json`](./TOKENS/shadows.json): Elevation levels and shadow styles.
  - [`borders.json`](./TOKENS/borders.json): Border widths and colors.
  - [`breakpoints.json`](./TOKENS/breakpoints.json): Responsive layout target viewports.
  - [`icons.json`](./TOKENS/icons.json): Lucide React outlined icon tokens.
- **`COMPONENTS/`**: Detailed component specifications (`buttons.md`, `inputs.md`, `cards.md`, `navigation.md`, `badges.md`, `modals.md`, `bottom-sheets.md`, `alerts.md`, `states.md`).
- **`GUIDELINES/`**: Usage rules (`rtl.md`, `typography.md`, `responsive.md`, `accessibility.md`, `usage-rules.md`).
- **`IMPLEMENTATION/`**: Code snippets for Web (`web.md`), Mobile (`mobile.md`), and Token Mapping (`token-mapping.md`).

---

## 🎨 Core Brand Palette at a Glance

- **SOLA Primary Blue**: `#0059FF` (Hover: `#0046CC`, Soft: `rgba(0, 89, 255, 0.10)`)
- **SOLA Coastal Gold**: `#FFD700` (Hover: `#E6C200`, Soft: `rgba(255, 215, 0, 0.15)`)
- **SOLA Background**: `#F5F7FA` | **Card Surface**: `#FFFFFF` | **Dark Header**: `rgba(15, 23, 42, 0.95)`
- **Typography**: Cairo (`dir="rtl"`) for Arabic; Monospace for EGP amounts, dispute IDs, and phone numbers.
