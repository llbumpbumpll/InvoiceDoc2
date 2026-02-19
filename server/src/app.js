// Backend entry: receives HTTP requests and forwards to routes (customers, products, invoices, reports)
import express from "express";
import cors from "cors";

import invoicesRoutes from "./routes/invoices.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import customersRoutes from "./routes/customers.routes.js";
import productsRoutes from "./routes/products.routes.js";

const app = express();
app.use(cors());
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
app.listen(port, host, () => console.log(`Invoice server listening on ${host}:${port}`));
