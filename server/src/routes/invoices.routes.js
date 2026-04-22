// Invoice API routes
// Example usage: POST /api/invoices
import { Router } from "express";
import * as c from "../controllers/invoices.controller.js";
import { listUnpaidForReceipt } from "../controllers/receipts.controller.js";

const r = Router();
r.get("/", c.listInvoices);
// LoV for receipt form: unpaid invoices for a specific customer.
// Must come BEFORE the /:invoiceNo wildcard route below.
r.get("/lov/unpaid", listUnpaidForReceipt);
r.get("/:invoiceNo", c.getInvoice);
r.post("/", c.createInvoice);
r.delete("/:invoiceNo", c.deleteInvoice);
r.put("/:invoiceNo", c.updateInvoice);

export default r;
