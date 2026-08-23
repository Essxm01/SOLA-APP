# Token consumption and generation

`TOKENS/*.json` is canonical. Run `npm run design:generate` to produce:

- `DESIGN_SYSTEM/generated/konfrm-tokens.css` — semantic CSS custom properties.
- `DESIGN_SYSTEM/generated/konfrm-tokens.ts` — typed, immutable token map for React/TypeScript.

The generator is intentionally dependency-free. It is suitable for the three existing Vite applications without introducing a framework or changing their build architecture.

## Application migration rule

When a controlled UI migration begins, each application imports the same generated CSS file from its global stylesheet and consumes semantic variables or the generated TypeScript map. Applications must not copy literal palette values into local theme files.

This authority task deliberately does not add imports to legacy screens: importing a token file alone would not migrate their raw values and could imply a visual redesign. The generated contract is ready for the next, scoped migration.

## Naming

Use semantic variables such as `--konfrm-color-primary`, `--konfrm-surface-primary`, `--konfrm-text-primary`, `--konfrm-border-default`, `--konfrm-radius-card`, and `--konfrm-space-page-horizontal`. Do not create product tokens named after Tailwind palettes such as `slate-900` or `blue-950`.
