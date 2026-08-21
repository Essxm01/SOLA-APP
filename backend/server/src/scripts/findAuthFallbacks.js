/**
 * Search for demo tokens and fake auth fallbacks
 * Location: backend/server/src/scripts/findAuthFallbacks.ts
 */
import fs from 'fs';
import path from 'path';
function searchDir(dir) {
    if (!fs.existsSync(dir))
        return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            searchDir(fullPath);
        }
        else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js'))) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            if (content.includes('demo_customer_access_token') || content.includes('demo_token') || content.includes('fake_token')) {
                console.log(`Found fallback in: ${fullPath}`);
                content.split('\n').forEach((line, idx) => {
                    if (line.includes('demo_customer_access_token') || line.includes('demo_token') || line.includes('fake_token')) {
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
