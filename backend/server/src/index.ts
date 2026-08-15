/**
 * Sola Vacation Rentals — Server Entry Point
 * Location: server/src/index.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */

import { ExpressServerApp } from './app';

const PORT = process.env.PORT || 4000;
const app = new ExpressServerApp();
const server = app.createHttpServer();

server.listen(PORT, () => {
  console.log(`[Sola API Server] Listening on http://localhost:${PORT}`);
  console.log(`[Sola API Server] Mode: Production REST API Gateway (Phase 7)`);
});
