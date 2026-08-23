import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';

const root = process.cwd();
const tokenDirectory = resolve(root, 'DESIGN_SYSTEM', 'TOKENS');
const experienceDirectory = resolve(root, 'DESIGN_SYSTEM', 'EXPERIENCE');
const baselinePath = resolve(root, 'DESIGN_SYSTEM', 'LEGACY_EXCEPTIONS.json');
const applications = ['customer-app', 'owner-app', 'admin-app'];
const sourceExtensions = new Set(['.tsx', '.ts', '.css']);

const tokenNames = ['colors.json', 'typography.json', 'spacing.json', 'radius.json', 'shadows.json', 'borders.json', 'breakpoints.json', 'icons.json'];
const requiredColorGroups = ['brand', 'surface', 'text', 'border', 'semantic', 'interaction'];

const validateTokens = async () => {
  const parsed = {};
  for (const name of tokenNames) {
    try {
      parsed[name] = JSON.parse(await readFile(resolve(tokenDirectory, name), 'utf8'));
    } catch (error) {
      throw new Error(`Invalid JSON token file ${name}: ${error.message}`);
    }
    if (parsed[name].meta?.version !== '2.0.0') throw new Error(`${name} must declare meta.version 2.0.0`);
  }
  for (const group of requiredColorGroups) {
    if (!parsed['colors.json'][group]) throw new Error(`colors.json is missing ${group}`);
  }
  if (parsed['colors.json'].surface.dark_header) throw new Error('colors.json may not approve a dark_header surface');
  if (parsed['typography.json'].fontFamily?.ui?.value?.includes('Amiri')) throw new Error('Amiri is not an approved primary UI font');

  const experienceFiles = ['DECISIONS.json', 'role-visibility.json'];
  const experience = {};
  for (const name of experienceFiles) {
    try {
      experience[name] = JSON.parse(await readFile(resolve(experienceDirectory, name), 'utf8'));
    } catch (error) {
      throw new Error(`Invalid experience JSON file ${name}: ${error.message}`);
    }
    if (experience[name].version !== '2.1.1') throw new Error(`${name} must declare version 2.1.1`);
  }
  const allowedDecisionStatuses = new Set(['APPROVED_EXISTING', 'RECOMMENDED', 'NEEDS_FOUNDER_DECISION']);
  for (const decision of experience['DECISIONS.json'].decisions ?? []) {
    if (!decision.id || !decision.title || !allowedDecisionStatuses.has(decision.status)) {
      throw new Error('Each experience decision needs id, title and an allowed status');
    }
  }
  for (const [domain, visibility] of Object.entries(experience['role-visibility.json'].domains ?? {})) {
    if (!visibility.customer || !visibility.owner || !visibility.admin) {
      throw new Error(`role-visibility.json domain ${domain} must cover customer, owner and admin`);
    }
  }
};

const filesIn = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = resolve(directory, entry.name);
    if (entry.isDirectory()) return filesIn(target);
    return sourceExtensions.has(extname(entry.name)) ? [target] : [];
  }));
  return nested.flat();
};

const findViolations = async () => {
  const results = [];
  for (const app of applications) {
    const source = resolve(root, app, 'src');
    for (const file of await filesIn(source)) {
      const contents = await readFile(file, 'utf8');
      const path = relative(root, file).replaceAll('\\', '/');
      const patterns = [
        ['raw-hex', /#[0-9a-fA-F]{3,8}\b/g],
        ['dark-surface-utility', /\b(?:bg|from|via|to)-(?:slate-900|slate-950|blue-950|blue-900)\b/g],
        ['decorative-dark-gradient', /\b(?:bg-gradient|from|via|to)-(?:slate-900|slate-950|blue-950|blue-900)\b/g],
        ['font-family-declaration', /font-family\s*:/g],
      ];
      for (const [rule, expression] of patterns) {
        for (const match of contents.matchAll(expression)) {
          const fingerprint = `${path}|${rule}|${match[0]}`;
          results.push({ app, fingerprint, path, rule, value: match[0] });
        }
      }
    }
  }
  return results;
};

await validateTokens();
const violations = await findViolations();
const counts = Object.fromEntries(violations.map(({ fingerprint }) => [fingerprint, 0]));
for (const { fingerprint } of violations) counts[fingerprint] += 1;

if (process.argv.includes('--write-baseline')) {
  const baseline = {
    version: 1,
    purpose: 'Existing legacy UI violations, counted by file/rule/value. This baseline does not permit new occurrences.',
    updateRule: 'Only regenerate after a reviewed migration; decreasing counts is expected as debt is removed.',
    entries: counts,
  };
  await writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`Wrote baseline for ${violations.length} legacy findings.`);
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
} catch (error) {
  throw new Error(`Cannot read LEGACY_EXCEPTIONS.json: ${error.message}. Run with --write-baseline once after review.`);
}
const newViolations = Object.entries(counts).filter(([fingerprint, count]) => count > (baseline.entries?.[fingerprint] ?? 0));
if (newViolations.length > 0) {
  console.error('New design-system drift detected:');
  for (const [fingerprint, count] of newViolations) console.error(`- ${fingerprint} (${count} found; baseline ${baseline.entries?.[fingerprint] ?? 0})`);
  process.exit(1);
}

console.log(`Design tokens valid. ${violations.length} legacy findings are covered by the committed baseline; no new drift detected.`);
