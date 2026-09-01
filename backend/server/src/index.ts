/**
 * Sola Vacation Rentals — Server Entry Point (Node.js only)
 * Location: server/src/index.ts
 * 
 * This is the Node.js HTTP server entry. Cloudflare Worker uses worker.ts.
 * For deployment: See backend/wrangler.json and docs/INTEGRATIONS.md
 */

import 'dotenv/config';
import { ExpressServerApp } from './app.js';

const PORT = process.env.PORT || 4000;
const app = new ExpressServerApp();
const server = app.createHttpServer();

if (process.env.NODE_ENV !== 'production' || !process.env.NO_SERVER_LISTEN) {
  server.listen(PORT, () => {
    console.log(`[Sola API Server] Listening on http://localhost:${PORT}`);
    console.log(`[Sola API Server] Mode: Node.js REST API Gateway`);
  }).on('error', (err: any) => {
    if (err.code !== 'EADDRINUSE') throw err;
  });
}

// Cloudflare Worker compatibility export
export default (req: any, res: any) => {
  server.emit('request', req, res);
};
