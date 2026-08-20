/**
 * Test Phone Normalizer against DB rows and edge cases
 * Location: backend/server/src/scripts/testPhoneNormalizer.ts
 */

import 'dotenv/config';
import { getDbPool } from '../services/dbClient.js';
import { normalizePhoneNumber } from '../utils/phoneNormalizer.js';

async function testNormalizer() {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    const res = await client.query('SELECT phone_number FROM users;');
    console.log(`Auditing ${res.rowCount} database phone numbers with normalizePhoneNumber:`);

    let allDbValid = true;
    for (const r of res.rows) {
      try {
        const norm = normalizePhoneNumber(r.phone_number);
        if (norm !== r.phone_number) {
          console.log(`Mismatch: DB "${r.phone_number}" -> Normalized "${norm}"`);
          allDbValid = false;
        }
      } catch (err: any) {
        console.log(`DB Phone "${r.phone_number}" failed normalization:`, err.message);
        allDbValid = false;
      }
    }
    console.log('All DB phone numbers match normalized output exactly:', allDbValid);

    // Test cases
    const testCases = [
      { input: '01012345678', expected: '+201012345678' },
      { input: '201012345678', expected: '+201012345678' },
      { input: '+201012345678', expected: '+201012345678' },
      { input: '+20 101 234 5678', expected: '+201012345678' },
      { input: '011-2345-6789', expected: '+201123456789' },
      { input: '012.3456.7890', expected: '+201234567890' },
      { input: '01555555555', expected: '+201555555555' },
    ];

    console.log('\nTesting valid input vectors:');
    testCases.forEach(tc => {
      const output = normalizePhoneNumber(tc.input);
      console.log(`   - "${tc.input}" -> "${output}" (${output === tc.expected ? 'PASS' : 'FAIL'})`);
    });

    console.log('\nTesting invalid input vectors:');
    const invalidCases = ['12345', '01312345678', '+14155552671', 'abcdefghijk', '', '01912345678'];
    invalidCases.forEach(inv => {
      try {
        normalizePhoneNumber(inv);
        console.log(`   - "${inv}" -> FAILED TO REJECT`);
      } catch (err: any) {
        console.log(`   - "${inv}" -> Correctly Rejected (${err.message})`);
      }
    });

  } finally {
    client.release();
    await pool.end();
  }
}

testNormalizer().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
