/**
 * Safe Audit of Secret Variable References
 * Location: backend/server/src/scripts/auditSecretReferences.ts
 * 
 * IMPORTANT: NEVER logs or extracts secret values. Only variable names and file locations.
 */

import fs from 'fs';
import path from 'path';

const TARGET_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID'
];

interface Finding {
  file: string;
  variable: string;
  line: number;
}

const findings: Finding[] = [];

function scanDirectory(dir: string) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(path.resolve('.'), fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === '.system_generated') {
        continue;
      }
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        for (const v of TARGET_VARS) {
          if (line.includes(v)) {
            findings.push({
              file: relPath,
              variable: v,
              line: idx + 1,
            });
          }
        }
      });
    }
  }
}

scanDirectory(path.resolve('..'));

console.log('=== SECRET VARIABLE DEPENDENCY MAP ===\n');
const groupedByVar: Record<string, string[]> = {};

for (const f of findings) {
  if (!groupedByVar[f.variable]) groupedByVar[f.variable] = [];
  groupedByVar[f.variable].push(`${f.file}:L${f.line}`);
}

for (const [varName, locs] of Object.entries(groupedByVar)) {
  console.log(`Variable: ${varName} (${locs.length} occurrences)`);
  locs.forEach(l => console.log(`   - ${l}`));
  console.log('');
}
