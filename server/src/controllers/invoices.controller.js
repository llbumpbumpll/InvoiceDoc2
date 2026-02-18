// Invoice controller (ตรรกะจัดการใบแจ้งหนี้)
// Example usage: listInvoices -> GET /api/invoices
import { z } from "zod";
import * as invoicesService from "../services/invoices.service.js";

// Schema validation for creating/updating invoices
const CreateInvoiceSchema = z.object({
  invoice_no: z.string().optional(), // Optional for auto-generation
  customer_id: z.number().int(),
  invoice_date: z.string().min(8), // YYYY-MM-DD
  vat_rate: z.number().min(0).max(1).default(0.07),
  line_items: z.array(z.object({
    product_id: z.number().int(),
    quantity: z.number().positive(),
    unit_price: z.number().nonnegative().optional()
  })).min(1)
});

// GET list of invoices with pagination, search, sort
export async function listInvoices(req, res) {
  try {
    const result = await invoicesService.listInvoices(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
}

// GET single invoice with header + line items
export async function getInvoice(req, res) {
  try {
    const id = Number(req.params.id);
    const result = await invoicesService.getInvoice(id);
    if (!result) return res.status(404).json({ error: "Invoice not found" });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
}

// POST create invoice (auto invoice_no if blank)
export async function createInvoice(req, res) {
  const parsed = CreateInvoiceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const result = await invoicesService.createInvoice(parsed.data);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
}

// DELETE invoice by id
export async function deleteInvoice(req, res) {
  try {
    const id = Number(req.params.id);
    const result = await invoicesService.deleteInvoice(id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
}

// PUT update invoice header + replace line items
export async function updateInvoice(req, res) {
  const parsed = CreateInvoiceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const id = Number(req.params.id);
    const result = await invoicesService.updateInvoice(id, parsed.data);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
}
