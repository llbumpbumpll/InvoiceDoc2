import * as receiptsService from "../services/receipts.service.js";
import { sendList, sendOne, sendCreated, sendOk, sendError } from "../utils/response.js";
import logger from "../utils/logger.js";

export async function listReceipts(req, res) {
  try {
    const result = await receiptsService.listReceipts(req.query);
    sendList(res, result);
  } catch (err) {
    logger.error("listReceipts failed", { error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 500);
  }
}

export async function getReceipt(req, res) {
  try {
    const receiptNo = decodeURIComponent(req.params.receiptNo || "");
    const result = await receiptsService.getReceipt(receiptNo);
    if (!result) return sendError(res, "Receipt not found", 404);
    sendOne(res, result);
  } catch (err) {
    logger.error("getReceipt failed", { receiptNo: req.params.receiptNo, error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 500);
  }
}

export async function createReceipt(req, res) {
  try {
    const result = await receiptsService.createReceipt(req.body);
    sendCreated(res, result);
  } catch (err) {
    logger.error("createReceipt failed", { error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 400);
  }
}

export async function updateReceipt(req, res) {
  try {
    const receiptNo = decodeURIComponent(req.params.receiptNo || "");
    const result = await receiptsService.updateReceipt(receiptNo, req.body);
    if (!result) return sendError(res, "Receipt not found", 404);
    sendOk(res, result);
  } catch (err) {
    logger.error("updateReceipt failed", { receiptNo: req.params.receiptNo, error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 400);
  }
}

export async function deleteReceipt(req, res) {
  try {
    const receiptNo = decodeURIComponent(req.params.receiptNo || "");
    const result = await receiptsService.deleteReceipt(receiptNo);
    if (!result) return sendError(res, "Receipt not found", 404);
    sendOk(res, result);
  } catch (err) {
    logger.error("deleteReceipt failed", { receiptNo: req.params.receiptNo, error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 500);
  }
}

/** LoV used by receipt form: unpaid invoices for a specific customer. */
export async function listUnpaidForReceipt(req, res) {
  try {
    const customer_code = req.query.customer_code ?? "";
    const exclude_receipt_id = req.query.exclude_receipt_id ?? null;
    const result = await receiptsService.listUnpaidInvoicesForCustomer(customer_code, { exclude_receipt_id });
    res.json({ success: true, data: result.data });
  } catch (err) {
    logger.error("listUnpaidForReceipt failed", { error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 500);
  }
}
