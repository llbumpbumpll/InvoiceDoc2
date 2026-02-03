// Express API server entry (เริ่มต้นเซิร์ฟเวอร์ API)
// Example usage: `node src/app.js` แล้วเรียก /health
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
app.listen(port, () => console.log(`Invoice server listening on :${port}`));
