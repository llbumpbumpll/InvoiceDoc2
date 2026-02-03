// Reports routes (เส้นทาง API สำหรับรายงาน)
// Example usage: GET /api/reports/product-sales
import { Router } from "express";
import * as c from "../controllers/reports.controller.js";
const r = Router();

r.get("/monthly-summary", c.getInvoicesMonthlySummary);
r.get("/product-sales", c.getSalesByProductSummary);
r.get("/customer-sales", c.getSalesByCustomerSummary);
r.get("/product-monthly-sales", c.getSalesByProductMonthlySummary);

export default r;
