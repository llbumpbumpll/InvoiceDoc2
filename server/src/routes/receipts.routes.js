// FILE: server/src/routes/receipts.routes.js
import { Router } from "express";
import {
  handleList,
  handleGet,
  handleCreate,
  handleUpdate,
  handleDelete,
  handleListUnpaidInvoices,
} from "../controllers/receipts.controller.js";

const router = Router();

router.get("/", handleList);
router.get("/unpaid-invoices", handleListUnpaidInvoices);
router.get("/:receiptNo", handleGet);
router.post("/", handleCreate);
router.put("/:receiptNo", handleUpdate);
router.delete("/:receiptNo", handleDelete);

export default router;
