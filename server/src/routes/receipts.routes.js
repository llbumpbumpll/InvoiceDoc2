import { Router } from "express";
import * as c from "../controllers/receipts.controller.js";

const r = Router();

r.get("/", c.listReceipts);
r.post("/", c.createReceipt);

// Business-key routes (receipt_no)
r.get("/:receiptNo", c.getReceipt);
r.put("/:receiptNo", c.updateReceipt);
r.delete("/:receiptNo", c.deleteReceipt);

export default r;
