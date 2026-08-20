/**
 * Search for phoneToUuid occurrences
 * Location: backend/server/src/scripts/findPhoneToUuid.ts
 */

import fs from 'fs';
import path from 'path';

function searchDir(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      searchDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes('phoneToUuid')) {
        console.log(`Found in: ${fullPath}`);
        content.split('\n').forEach((line, idx) => {
          if (line.includes('phoneToUuid')) {
            console.log(`   L${idx + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

searchDir(path.resolve('server/src'));
searchDir(path.resolve('../customer-app/src'));
searchDir(path.resolve('../owner-app/src'));
searchDir(path.resolve('../admin-app/src'));
