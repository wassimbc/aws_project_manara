// Express app for the Orders service.
// Orders receives external HTTP calls from ALB and makes internal calls via Cloud Map.

import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './config/logger';
import { config } from './config/config';
import { request_id_middleware } from './middleware/request_id';
import { error_handler } from './middleware/error_handler';
import { xray_open, xray_close } from './middleware/xray_middleware';
import { orders_router } from './routes/orders_routes';

const app = express();

app.use(xray_open(config.SERVICE_NAME));
app.use(express.json());
app.use(request_id_middleware);

app.use(pinoHttp({
  logger,
  genReqId: (req) => req.request_id
}));

app.use('/', orders_router);
app.use(error_handler);
app.use(xray_close());

export { app };
