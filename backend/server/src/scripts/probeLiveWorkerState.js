"use strict";
/**
 * Phase 1: Live Worker Production State Probe
 * Location: backend/server/src/scripts/probeLiveWorkerState.ts
 */
const WORKER = 'https://sola-backend-api.essxm01.workers.dev';
async function probe() {
    console.log('=== PHASE 1: PROBING CURRENT LIVE WORKER STATE ===\n');
    try {
        const h = await fetch(WORKER + '/api/v1/health');
        const hJson = await h.json().catch(() => null);
        console.log(`1. GET /api/v1/health -> HTTP ${h.status} (${JSON.stringify(hJson)})`);
        const s = await fetch(WORKER + '/api/v1/customer/properties/search');
        const sJson = await s.json().catch(() => null);
        console.log(`2. GET /api/v1/customer/properties/search -> HTTP ${s.status} (Count: ${sJson?.data?.length ?? 'none'}, success: ${sJson?.success})`);
        const d = await fetch(WORKER + '/api/v1/customer/properties/7bac2fbc-78ab-4f4f-8be4-c9bf5d5e22bc');
        const dJson = await d.json().catch(() => null);
        console.log(`3. GET /api/v1/customer/properties/7bac2fbc-78ab-4f4f-8be4-c9bf5d5e22bc -> HTTP ${d.status} (${d.status === 200 ? 'Property fetched' : JSON.stringify(dJson)})`);
        const a = await fetch(WORKER + '/api/v1/customer/properties/7bac2fbc-78ab-4f4f-8be4-c9bf5d5e22bc/availability');
        const aJson = await a.json().catch(() => null);
        console.log(`4. GET /api/v1/customer/properties/.../availability -> HTTP ${a.status} (${a.status === 200 ? 'Availability fetched' : JSON.stringify(aJson)})`);
        const q = await fetch(WORKER + '/api/v1/customer/bookings/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                propertyId: '7bac2fbc-78ab-4f4f-8be4-c9bf5d5e22bc',
                checkIn: '2026-09-01',
                checkOut: '2026-09-05',
                guests: 4
            })
        });
        const qJson = await q.json().catch(() => null);
        console.log(`5. POST /api/v1/customer/bookings/calculate -> HTTP ${q.status} (${q.status === 200 ? 'Quote calculated' : JSON.stringify(qJson)})\n`);
        if (h.status === 200 && s.status === 200 && d.status === 200 && a.status === 200 && q.status === 200) {
            console.log('CLASSIFICATION: A. Worker + DB currently operational');
        }
        else if (h.status === 200) {
            console.log('CLASSIFICATION: B. Health works but DB-backed endpoints are broken');
        }
        else {
            console.log('CLASSIFICATION: C. Worker itself is broken');
        }
    }
    catch (err) {
        console.error('Fatal probe error:', err);
        console.log('\nCLASSIFICATION: C. Worker itself is broken');
    }
}
probe().catch(console.error);
