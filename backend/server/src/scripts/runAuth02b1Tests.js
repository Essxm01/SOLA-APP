/**
 * Dedicated Runner for AUTH-02B1 Tests
 * Location: backend/server/src/scripts/runAuth02b1Tests.ts
 */
import { runSharedIdentityResolutionSuite } from '../tests/sharedIdentityResolution.test.js';
async function main() {
    console.log('======================================================================');
    console.log('       AUTH-02B1: SHARED IDENTITY RESOLUTION & ROLE ISSUANCE');
    console.log('======================================================================\n');
    const summary = await runSharedIdentityResolutionSuite();
    summary.results.forEach((r, idx) => {
        const status = r.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`  [${idx + 1}] ${status} - ${r.name} ${r.error ? `(${r.error})` : ''}`);
    });
    console.log('\n======================================================================');
    console.log(`TOTAL: ${summary.total} | PASSED: ${summary.passed} | FAILED: ${summary.failed}`);
    console.log('======================================================================');
    if (summary.failed > 0) {
        process.exit(1);
    }
}
main().catch(err => {
    console.error('Error running suite:', err);
    process.exit(1);
});
