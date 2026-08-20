/**
 * Live Smoke Regression against Production Cloudflare Worker
 * Location: backend/server/src/scripts/smokeLiveWorker.ts
 */

async function runLiveSmoke() {
  const base = 'https://sola-backend-api.essxm01.workers.dev';
  console.log('--- Probing Live Cloudflare Worker at:', base, '---\n');

  // 1. Health
  const resHealth = await fetch(`${base}/api/v1/health`);
  const jsonHealth = await resHealth.json();
  console.log('1. Health Status:', resHealth.status, jsonHealth);

  // 2. Search
  const resSearch = await fetch(`${base}/api/v1/customer/properties/search`);
  const jsonSearch = await resSearch.json();
  console.log('2. Search Status:', resSearch.status, 'Properties count:', jsonSearch.data?.length);

  // 3. Property Details
  const resDetails = await fetch(`${base}/api/v1/customer/properties/7bac2fbc-78ab-4f4f-8be4-c9bf5d5e22bc`);
  const jsonDetails = await resDetails.json();
  console.log('3. Details Status:', resDetails.status, 'Title:', jsonDetails.data?.title);

  // 4. Availability
  const resAvail = await fetch(`${base}/api/v1/customer/properties/7bac2fbc-78ab-4f4f-8be4-c9bf5d5e22bc/availability`);
  const jsonAvail = await resAvail.json();
  console.log('4. Availability Status:', resAvail.status, 'Unavailable ranges:', jsonAvail.data?.unavailableRanges);

  // 5. Quote Calculation
  const resQuote = await fetch(`${base}/api/v1/customer/bookings/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      propertyId: '7bac2fbc-78ab-4f4f-8be4-c9bf5d5e22bc',
      checkIn: '2026-09-01',
      checkOut: '2026-09-05',
      guests: 4,
    }),
  });
  const jsonQuote = await resQuote.json();
  console.log('5. Quote Status:', resQuote.status, 'Quote data:', jsonQuote.data);
}

runLiveSmoke().catch(err => {
  console.error('Smoke failed:', err);
  process.exit(1);
});
