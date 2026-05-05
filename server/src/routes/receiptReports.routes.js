// FILE: server/src/routes/receiptReports.routes.js
import { Router } from "express";
import { handleReceiptList, handleInvoiceReceiptReport } from "../controllers/receiptReports.controller.js";

const router = Router();

router.get("/receipt-list", handleReceiptList);
router.get("/invoice-receipt", handleInvoiceReceiptReport);

export default router;
