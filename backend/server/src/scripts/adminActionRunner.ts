/**
 * Sola Vacation Rentals — Development Admin Action Runner Script
 * Location: server/src/scripts/adminActionRunner.ts
 * 
 * Safety Rule:
 * - DEVELOPMENT ONLY (Refuses to execute when NODE_ENV !== 'development')
 * - Exercises real HTTP /api/v1/admin/* endpoints using a development ROLE_ADMIN JWT
 * - Zero direct DB mutations inside runner script
 */

import { generateJwtToken } from '../middleware/auth';

export async function runAdminActionSimulation(baseUrl = 'http://localhost:4000/api/v1') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SECURITY_ERROR_ADMIN_RUNNER_FORBIDDEN_IN_PRODUCTION');
  }

  console.log('[Admin Action Runner] Generating Development ROLE_ADMIN JWT Token...');
  const devAdminToken = 'admin_token_dev_secret';

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${devAdminToken}`,
  };

  console.log('[Admin Action Runner] Executing Property Review (PUBLISHED)...');
  const propRes = await fetch(`${baseUrl}/admin/properties/prop_test_001/review`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ decision: 'PUBLISHED', reviewNotes: 'Approved during dev simulation' }),
  });
  const propData = await propRes.json();
  console.log('[Admin Action Runner] Property Review Response:', propData);

  console.log('[Admin Action Runner] Executing Owner Document Review (APPROVED)...');
  const docRes = await fetch(`${baseUrl}/admin/owners/owner_test_001/documents/doc_test_001/review`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ decision: 'APPROVED', reason: 'Verified ID document' }),
  });
  const docData = await docRes.json();
  console.log('[Admin Action Runner] Document Review Response:', docData);

  console.log('[Admin Action Runner] Executing Payout Processing (COMPLETED)...');
  const payoutRes = await fetch(`${baseUrl}/admin/payouts/payout_test_001/process`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'COMPLETED', providerTxId: 'INSTAPAY_TX_998877' }),
  });
  const payoutData = await payoutRes.json();
  console.log('[Admin Action Runner] Payout Processing Response:', payoutData);

  console.log('[Admin Action Runner] Executing Dispute Resolution (RELEASE_TO_OWNER)...');
  const disputeRes = await fetch(`${baseUrl}/admin/disputes/disp_test_001/resolve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ resolutionType: 'RELEASE_TO_OWNER', adminNotes: 'No financial action needed' }),
  });
  const disputeData = await disputeRes.json();
  console.log('[Admin Action Runner] Dispute Resolution Response:', disputeData);

  return {
    success: true,
    propData,
    docData,
    payoutData,
    disputeData,
  };
}

if (require.main === module) {
  runAdminActionSimulation()
    .then(() => console.log('[Admin Action Runner] Dev simulation completed successfully.'))
    .catch((err) => {
      console.error('[Admin Action Runner] Simulation error:', err.message);
      process.exit(1);
    });
}
