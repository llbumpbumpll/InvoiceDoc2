// FILE: server/src/controllers/receiptReports.controller.js
import { getReceiptList, getInvoiceReceiptReport } from "../services/receiptReports.service.js";

export async function handleReceiptList(req, res) {
  try {
    const { date_from, date_to, customer_code, page = 1, limit = 50 } = req.query;
    const result = await getReceiptList({ date_from, date_to, customer_code, page, limit });
    res.json({
      success: true,
      data: result.data,
      meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function handleInvoiceReceiptReport(req, res) {
  try {
    const { date_from, date_to, customer_code, page = 1, limit = 50 } = req.query;
    const result = await getInvoiceReceiptReport({ date_from, date_to, customer_code, page, limit });
    res.json({
      success: true,
      data: result.data,
      meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}
