import * as reportsService from "../services/reports.service.js";

export async function getInvoicesMonthlySummary(req, res) {
  try {
    const rows = await reportsService.getInvoicesMonthlySummary();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
}

export async function getSalesByProductSummary(req, res) {
  try {
    const result = await reportsService.getSalesByProductSummary(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
}

export async function getSalesByCustomerSummary(req, res) {
  try {
    const result = await reportsService.getSalesByCustomerSummary(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
}

export async function getSalesByProductMonthlySummary(req, res) {
  try {
    const result = await reportsService.getSalesByProductMonthlySummary(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
}
