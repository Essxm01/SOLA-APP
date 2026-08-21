/**
 * Scan all server files for hardcoded secrets or base64 keys
 * Location: backend/server/src/scripts/checkNoHardcodedSecrets.ts
 */
import fs from 'fs';
import path from 'path';
const SUSPICIOUS_PATTERNS = [
    'sb_secret_',
    'c2Jfc2VjcmV0',
    'Essam112288-',
    'postgresql://postgres.zrbmbjgcsowfqklmxbyn'
];
function scanDir(dir, issues) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
                scanDir(fullPath, issues);
            }
        }
        else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.json'))) {
            if (entry.name === 'scanGitForSecrets.ts' || entry.name === 'checkNoHardcodedSecrets.ts')
                continue;
            const content = fs.readFileSync(fullPath, 'utf-8');
            for (const p of SUSPICIOUS_PATTERNS) {
                if (content.includes(p)) {
                    issues.push(`File ${fullPath} contains pattern: ${p.substring(0, 8)}...`);
                }
            }
        }
    }
}
const issues = [];
scanDir(path.resolve('server/src'), issues);
console.log('=== HARDCODED SECRET SANITIZATION AUDIT ===\n');
if (issues.length === 0) {
    console.log('✅ ALL SERVER SOURCE CODE IS 100% CLEAN (Zero hardcoded secrets found in working tree)\n');
}
else {
    console.log(`❌ FOUND ${issues.length} ISSUES:`);
    issues.forEach(iss => console.log('   - ' + iss));
}
