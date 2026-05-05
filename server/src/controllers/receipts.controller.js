// FILE: server/src/controllers/receipts.controller.js
import {
  listReceipts,
  getReceipt,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  listUnpaidInvoicesByCustomer,
} from "../services/receipts.service.js";

export async function handleList(req, res) {
  try {
    const { search = "", page = 1, limit = 10, sortBy, sortDir } = req.query;
    const result = await listReceipts({ search, page, limit, sortBy, sortDir });
    res.json({
      success: true,
      data: result.data,
      meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function handleGet(req, res) {
  try {
    const receipt = await getReceipt(req.params.receiptNo);
    if (!receipt) return res.status(404).json({ success: false, error: { message: "Receipt not found" } });
    res.json({ success: true, data: receipt });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function handleCreate(req, res) {
  try {
    const result = await createReceipt(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function handleUpdate(req, res) {
  try {
    const result = await updateReceipt(req.params.receiptNo, req.body);
    if (!result) return res.status(404).json({ success: false, error: { message: "Receipt not found" } });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function handleDelete(req, res) {
  try {
    const result = await deleteReceipt(req.params.receiptNo);
    if (!result) return res.status(404).json({ success: false, error: { message: "Receipt not found" } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function handleListUnpaidInvoices(req, res) {
  try {
    const { customer_code, receipt_no } = req.query;
    const rows = await listUnpaidInvoicesByCustomer(customer_code, receipt_no || null);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}
