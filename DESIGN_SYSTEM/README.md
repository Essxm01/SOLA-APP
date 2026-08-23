# KONFRM Design System

**Version:** `2.0.0`
**Authority:** `DESIGN_SYSTEM/` is the independent visual and interaction source of truth for KONFRM / كونفرم.

```
                         DESIGN_SYSTEM/
                               |
          +--------------------+--------------------+
          |                    |                    |
     Customer App          Owner App            Admin App
```

Applications consume this system. They do not define it, and no production application is a source from which global rules are automatically extracted. Existing screens are implementation evidence only. If an implementation conflicts with this directory, **DESIGN_SYSTEM wins**.

## Approved foundations

- Product identity: **KONFRM / كونفرم**; the official mark is [`LOGO.svg`](./LOGO.svg).
- Light-first product: white and light neutral surfaces are dominant.
- Primary Blue: `#0059FF`; Summer Yellow: `#FFD700`, used sparingly as an accent.
- UI font: Cairo; Arabic-first, RTL-native.
- Customer and Owner are mobile-first. Admin is desktop operational.
- 8pt-derived spacing, restrained elevation, Lucide React icons, and 44px minimum mobile touch targets.

Infrastructure identifiers that still contain `SOLA` are outside this design-system scope and remain unchanged.

## What is here

- [`TOKENS/`](./TOKENS): canonical, machine-readable contracts.
- [`generated/`](./generated): generated CSS variables and TypeScript map for all React applications. Do not hand-edit generated output.
- [`COMPONENTS/`](./COMPONENTS): behavioural and accessibility contracts, not app-specific implementations.
- [`GUIDELINES/`](./GUIDELINES): roles, RTL, responsive, accessibility and financial presentation rules.
- [`LEGACY_DRIFT.md`](./LEGACY_DRIFT.md): static migration backlog; it records debt without authorizing it.
- [`LEGACY_EXCEPTIONS.json`](./LEGACY_EXCEPTIONS.json): baseline for the lightweight anti-drift check.

## Contribution workflow

Before implementing any UI pattern:

1. Search this directory for an existing token or component contract.
2. Consume it if it exists.
3. If it is missing, do not invent it locally.
4. Propose the central addition, including role impact and accessibility states.
5. Record the decision in tokens/components and version it appropriately.
6. Only then implement it in an application.

See [`GOVERNANCE.md`](./GOVERNANCE.md) for approval boundaries and [`CHANGELOG.md`](./CHANGELOG.md) for releases.
