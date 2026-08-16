import 'dotenv/config';
import { ExpressServerApp } from '../server/src/app.js';

const app = new ExpressServerApp();
const server = app.createHttpServer();

export default (req: any, res: any) => {
  server.emit('request', req, res);
};
