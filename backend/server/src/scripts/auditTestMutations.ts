/**
 * Audit Test Files for DB Mutations
 * Location: backend/server/src/scripts/auditTestMutations.ts
 */

import fs from 'fs';
import path from 'path';

const testsDir = path.resolve('server/src/tests');
const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.ts'));

console.log('=== AUDITING TEST SUITES FOR DB INTERACTION & MUTATION PATTERNS ===\n');

for (const file of files) {
  const content = fs.readFileSync(path.join(testsDir, file), 'utf-8');
  const hasInsert = /INSERT\s+INTO/i.test(content);
  const hasUpdate = /UPDATE\s+[a-z_]+/i.test(content);
  const hasDelete = /DELETE\s+FROM/i.test(content);
  const hasUpsert = /ownerDb\.upsert|propertyDb\.create|db\.upsert/i.test(content);
  const hasQueryDb = /queryDb|getDbPool|pg\.Pool/i.test(content);

  const mutations: string[] = [];
  if (hasInsert) mutations.push('SQL_INSERT');
  if (hasUpdate) mutations.push('SQL_UPDATE');
  if (hasDelete) mutations.push('SQL_DELETE');
  if (hasUpsert) mutations.push('REPOSITORY_MUTATION');

  console.log(`[${file}]`);
  console.log(`   - Direct DB Access (queryDb/Pool): ${hasQueryDb}`);
  console.log(`   - Mutation Patterns: ${mutations.length > 0 ? mutations.join(', ') : 'NONE (In-memory / Read-only / Mock)'}`);
  
  if (mutations.length > 0) {
    // Look for where mutations occur
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
      if (/INSERT\s+INTO|DELETE\s+FROM|UPDATE\s+[a-z_]+|ownerDb\.upsert/i.test(l) && !l.trim().startsWith('//')) {
        console.log(`     L${idx + 1}: ${l.trim().slice(0, 100)}`);
      }
    });
  }
  console.log('');
}
