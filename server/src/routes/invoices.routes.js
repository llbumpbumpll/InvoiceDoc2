// Invoice routes (เส้นทาง API สำหรับใบแจ้งหนี้)
// Example usage: POST /api/invoices
import { Router } from "express";
import * as c from "../controllers/invoices.controller.js";

const r = Router();
r.get("/", c.listInvoices);
r.get("/:id", c.getInvoice);
r.post("/", c.createInvoice);
r.delete("/:id", c.deleteInvoice);
r.put("/:id", c.updateInvoice);

export default r;
