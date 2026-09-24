const https = require('https');

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

if (!token || !accountId) {
  console.log('Skipping Cloudflare Pages API update: CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID missing.');
  process.exit(0);
}

const payload = JSON.stringify({
  deployment_configs: {
    production: {
      env_vars: {
        VITE_CUSTOMER_AUTH_V2_ENABLED: { value: 'true' },
        VITE_API_BASE_URL: { value: 'https://sola-backend-api.essxm01.workers.dev/api/v1' }
      }
    }
  }
});

const req = https.request(
  {
    hostname: 'api.cloudflare.com',
    path: `/client/v4/accounts/${accountId}/pages/projects/sola-customer-app`,
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  },
  (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      console.log('Cloudflare Pages API Response Code:', res.statusCode);
      try {
        const json = JSON.parse(data);
        console.log('Cloudflare Pages API Result success:', json.success);
      } catch {
        console.log('Cloudflare Pages Response:', data);
      }
    });
  }
);

req.on('error', (err) => {
  console.log('Non-fatal error contacting Cloudflare Pages API:', err.message);
});

req.write(payload);
req.end();
