import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const tokenDirectory = resolve(root, 'DESIGN_SYSTEM', 'TOKENS');
const outputDirectory = resolve(root, 'DESIGN_SYSTEM', 'generated');

const readJson = async (name) => JSON.parse(await readFile(resolve(tokenDirectory, name), 'utf8'));
const [colors, spacing, radius, shadows, typography, borders, breakpoints, icons] = await Promise.all([
  readJson('colors.json'), readJson('spacing.json'), readJson('radius.json'), readJson('shadows.json'),
  readJson('typography.json'), readJson('borders.json'), readJson('breakpoints.json'), readJson('icons.json'),
]);

const value = (entry) => typeof entry === 'string' ? entry : entry.value;
const cssVariables = {
  'color-primary': value(colors.brand.primary),
  'color-primary-hover': value(colors.brand.primaryHover),
  'color-primary-soft': value(colors.brand.primarySoft),
  'color-accent': value(colors.brand.accent),
  'color-accent-soft': value(colors.brand.accentSoft),
  ...Object.fromEntries(Object.entries(colors.surface).map(([key, entry]) => [`surface-${key}`, value(entry)])),
  ...Object.fromEntries(Object.entries(colors.text).map(([key, entry]) => [`text-${key}`, value(entry)])),
  ...Object.fromEntries(Object.entries(colors.border).map(([key, entry]) => [`border-${key}`, value(entry)])),
  ...Object.fromEntries(Object.entries(colors.interaction).map(([key, entry]) => [`interaction-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, value(entry)])),
  ...Object.fromEntries(Object.entries(spacing.semantic).map(([key, entry]) => [`space-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, entry])),
  ...Object.fromEntries(Object.entries(spacing.scale).map(([key, entry]) => [`space-${key}`, entry])),
  ...Object.fromEntries(Object.entries(radius.radius).map(([key, entry]) => [`radius-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, entry])),
  ...Object.fromEntries(Object.entries(shadows.shadow).map(([key, entry]) => [`shadow-${key}`, entry])),
  'font-ui': typography.fontFamily.ui.value,
  'font-size-body': typography.roles.body.fontSize,
  'line-height-body': typography.roles.body.lineHeight,
  'breakpoint-mobile': breakpoints.breakpoints.mobile,
  'breakpoint-mobile-wide': breakpoints.breakpoints.mobileWide,
  'breakpoint-desktop-admin': breakpoints.breakpoints.desktopAdmin,
  'border-width-default': borders.width.default,
  'icon-size-default': icons.sizes.default,
};

const css = `/* Generated from DESIGN_SYSTEM/TOKENS. Do not edit manually. */\n:root {\n${Object.entries(cssVariables)
  .map(([key, entry]) => `  --konfrm-${key}: ${entry};`).join('\n')}\n}\n`;

const tokenMap = {
  version: colors.meta.version,
  colors: {
    brand: Object.fromEntries(Object.entries(colors.brand).map(([key, entry]) => [key, value(entry)])),
    surface: Object.fromEntries(Object.entries(colors.surface).map(([key, entry]) => [key, value(entry)])),
    text: Object.fromEntries(Object.entries(colors.text).map(([key, entry]) => [key, value(entry)])),
    border: Object.fromEntries(Object.entries(colors.border).map(([key, entry]) => [key, value(entry)])),
    semantic: colors.semantic,
    interaction: Object.fromEntries(Object.entries(colors.interaction).map(([key, entry]) => [key, value(entry)])),
  },
  spacing: spacing.semantic,
  radius: radius.radius,
  shadow: shadows.shadow,
  typography: typography.roles,
  breakpoints: breakpoints.breakpoints,
  icons: { library: icons.library, sizes: icons.sizes, strokeWidth: icons.style.strokeWidth },
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(resolve(outputDirectory, 'konfrm-tokens.css'), css);
await writeFile(
  resolve(outputDirectory, 'konfrm-tokens.ts'),
  `// Generated from DESIGN_SYSTEM/TOKENS. Do not edit manually.\nexport const konfrmTokens = ${JSON.stringify(tokenMap, null, 2)} as const;\n\nexport type KonfrmTokens = typeof konfrmTokens;\n`,
);
console.log('Generated DESIGN_SYSTEM/generated/konfrm-tokens.css and konfrm-tokens.ts');
