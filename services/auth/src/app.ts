// What this file does:
// Creates the Express application and registers all middleware and routes.
// This is separated from server.ts so we can import the app in tests
// without starting a real HTTP server.
//
// Middleware runs in the ORDER it is registered.
// A request flows through: X-Ray open -> requestId -> pinoHttp -> routes -> error_handler -> X-Ray close

import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './config/logger';
import { config } from './config/config';
import { request_id_middleware } from './middleware/request_id';
import { error_handler } from './middleware/error_handler';
import { xray_open, xray_close } from './middleware/xray_middleware';
import { auth_router } from './routes/auth_routes';

const app = express();

// =====================
// Middleware: X-Ray open
// Must be registered FIRST so it wraps the entire request lifecycle.
// =====================
app.use(xray_open(config.SERVICE_NAME));

// =====================
// Middleware: Parse JSON request bodies
// Without this, req.body is always undefined for POST/PUT requests.
// =====================
app.use(express.json());

// =====================
// Middleware: Request ID
// Attaches a unique UUID to every request so we can trace it through logs.
// =====================
app.use(request_id_middleware);

// =====================
// Middleware: HTTP request logging
// Automatically logs every request and response with timing info.
// Output format: { level, service, method, url, statusCode, responseTime, requestId }
// =====================
app.use(pinoHttp({
  logger,
  // Attach the requestId to every log line from this request
  genReqId: (req) => req.request_id
}));

// =====================
// Routes
// All auth endpoints are defined in auth_routes.ts.
// =====================
app.use('/', auth_router);

// =====================
// Middleware: Error handler
// Must be registered LAST. Express recognises it as an error handler because it has 4 parameters.
// Any error thrown inside a route will be caught here and returned as a JSON response.
// =====================
app.use(error_handler);

// =====================
// Middleware: X-Ray close
// Must be registered after all routes and the error handler.
// =====================
app.use(xray_close());

export { app };
