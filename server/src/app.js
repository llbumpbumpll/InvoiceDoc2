// Backend entry: receives HTTP requests and forwards to routes (customers, products, invoices, reports)
import express from "express";
import cors from "cors";

import logger from "./utils/logger.js";
import invoicesRoutes from "./routes/invoices.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import customersRoutes from "./routes/customers.routes.js";
import productsRoutes from "./routes/products.routes.js";

const app = express();

// ANSI colors for request log (dev only; production uses JSON without codes)
const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
};
const methodColor = { GET: c.green, POST: c.cyan, PUT: c.yellow, DELETE: c.magenta };
const statusColor = (s) => (s >= 500 ? c.red : s >= 400 ? c.yellow : s >= 300 ? c.blue : c.green);
const useColor = process.env.NODE_ENV !== "production" && process.stdout.isTTY;

// Request logging: one line per request, colored by method and status in dev
app.use((req, res, next) => {
  const start = Date.now();
  const method = req.method;
  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    let msg = `[${method}] ${req.originalUrl} ${status} ${duration}ms`;
    if (useColor) {
      const m = methodColor[method] || c.dim;
      const s = statusColor(status);
      msg = `${m}[${method}]${c.reset} ${req.originalUrl} ${s}${status}${c.reset} ${c.dim}${duration}ms${c.reset}`;
    }
    logger.info(msg, { method, url: req.originalUrl, status, durationMs: duration });
  });
  next();
});

// CORS: allow origin from CORS_ORIGIN env, or * if unset (e.g. dev). Allows common methods/headers.
const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors({
    origin: corsOrigin === undefined || corsOrigin === "" ? true : corsOrigin.split(",").map((o) => o.trim()),
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Health check
app.get("/health", (_, res) => res.json({ ok: true }));

// API routes
app.use("/api/customers", customersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/invoices", invoicesRoutes);
app.use("/api/reports", reportsRoutes);

const port = process.env.PORT || 4000;
const host = process.env.HOST || "0.0.0.0";
app.listen(port, host, () => logger.info(`Invoice server listening on ${host}:${port}`));
