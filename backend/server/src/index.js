/**
 * Sola Vacation Rentals — Server Entry Point & Serverless Adapter
 * Location: server/src/index.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */
import 'dotenv/config';
import { ExpressServerApp } from './app.js';
const PORT = process.env.PORT || 4000;
const app = new ExpressServerApp();
const server = app.createHttpServer();
if (!process.env.VERCEL && !process.env.NO_SERVER_LISTEN) {
    server.listen(PORT, () => {
        console.log(`[Sola API Server] Listening on http://localhost:${PORT}`);
        console.log(`[Sola API Server] Mode: Production REST API Gateway (Phase 7)`);
    }).on('error', (err) => {
        if (err.code !== 'EADDRINUSE')
            throw err;
    });
}
export default (req, res) => {
    server.emit('request', req, res);
};
