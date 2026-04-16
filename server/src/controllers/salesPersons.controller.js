import { listSalesPersons, getSalesPerson, createSalesPerson, updateSalesPerson, deleteSalesPerson } from "../services/salesPersons.service.js";

export async function handleList(req, res) {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;
    const result = await listSalesPersons({ search, page, limit });
    res.json({ success: true, data: result.data, meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function handleGet(req, res) {
  try {
    const sp = await getSalesPerson(req.params.code);
    if (!sp) return res.status(404).json({ success: false, error: { message: "Sales person not found" } });
    res.json({ success: true, data: sp });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function handleCreate(req, res) {
  try {
    const sp = await createSalesPerson(req.body);
    res.status(201).json({ success: true, data: sp });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function handleUpdate(req, res) {
  try {
    const sp = await updateSalesPerson(req.params.code, req.body);
    if (!sp) return res.status(404).json({ success: false, error: { message: "Sales person not found" } });
    res.json({ success: true, data: sp });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function handleDelete(req, res) {
  try {
    await deleteSalesPerson(req.params.code);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}
