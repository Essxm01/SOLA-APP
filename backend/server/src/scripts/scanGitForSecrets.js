/**
 * Safe Git Repository Secret Scanner
 * Location: backend/server/src/scripts/scanGitForSecrets.ts
 *
 * Scans git history for committed secrets without ever printing secret values.
 */
import { execSync } from 'child_process';
function scanGitHistory() {
    const findings = [];
    try {
        // Get full git log with diffs
        const gitLog = execSync('git log -p -n 100', { maxBuffer: 50 * 1024 * 1024, encoding: 'utf-8' });
        const lines = gitLog.split('\n');
        let currentCommit = '';
        let currentDate = '';
        let currentAuthor = '';
        let currentFile = '';
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('commit ')) {
                currentCommit = line.split(' ')[1]?.trim() || '';
            }
            else if (line.startsWith('Date:')) {
                currentDate = line.replace('Date:', '').trim();
            }
            else if (line.startsWith('Author:')) {
                currentAuthor = line.replace('Author:', '').trim();
            }
            else if (line.startsWith('diff --git')) {
                const parts = line.split(' ');
                currentFile = parts[parts.length - 1]?.replace(/^b\//, '') || '';
            }
            else if (line.startsWith('+') && !line.startsWith('+++')) {
                const addedLine = line.substring(1);
                // Check for Supabase Service Role Secret Key (sb_secret_...)
                if (addedLine.includes('sb_secret_') || addedLine.includes('c2Jfc2VjcmV0Xz')) {
                    findings.push({
                        commitSha: currentCommit.substring(0, 10),
                        commitDate: currentDate,
                        author: currentAuthor,
                        filePath: currentFile,
                        credentialType: 'Supabase Service Role Key (sb_secret_ / encoded)',
                        summary: 'Detected hardcoded/encoded Supabase secret key in diff addition',
                    });
                }
                // Check for raw PostgreSQL connection string with password in tracked files (excluding .env.example)
                if (addedLine.includes('postgresql://') && addedLine.includes('@aws-1-eu-west-1.pooler.supabase.com') && !currentFile.includes('.example')) {
                    findings.push({
                        commitSha: currentCommit.substring(0, 10),
                        commitDate: currentDate,
                        author: currentAuthor,
                        filePath: currentFile,
                        credentialType: 'PostgreSQL Session Pooler URI with Password',
                        summary: 'Detected PostgreSQL connection string with embedded password in tracked file',
                    });
                }
            }
        }
    }
    catch (err) {
        console.error('Git scan error:', err.message);
    }
    return findings;
}
const findings = scanGitHistory();
console.log('=== GIT HISTORY SECRET SCAN REPORT ===\n');
if (findings.length === 0) {
    console.log('STATUS: NOT FOUND (Zero committed secrets detected in audited commit history)\n');
}
else {
    console.log(`STATUS: FOUND (${findings.length} committed secret occurrences detected in Git history)\n`);
    findings.forEach((f, idx) => {
        console.log(`[${idx + 1}] COMMIT: ${f.commitSha} (${f.commitDate})`);
        console.log(`    File: ${f.filePath}`);
        console.log(`    Credential Type: ${f.credentialType}`);
        console.log(`    Summary: ${f.summary}\n`);
    });
}
