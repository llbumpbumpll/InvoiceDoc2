import * as salesPersonsService from "../services/salesPersons.service.js";

export async function handleList(req, res) {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;
    const result = await salesPersonsService.listSalesPersons({ search, page, limit });
    res.json({ success: true, data: result.data, meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function handleGet(req, res) {
  try {
    const code = decodeURIComponent(req.params.code || "");
    const row = await salesPersonsService.getSalesPersonByCode(code);
    if (!row) return res.status(404).json({ success: false, error: { message: "Sales person not found" } });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function handleCreate(req, res) {
  try {
    const result = await salesPersonsService.createSalesPerson(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
}

export async function handleUpdate(req, res) {
  try {
    const code = decodeURIComponent(req.params.code || "");
    const existing = await salesPersonsService.getSalesPersonByCode(code);
    if (!existing) return res.status(404).json({ success: false, error: { message: "Sales person not found" } });
    const body = {
      code: req.body.code !== undefined ? req.body.code : existing.code,
      name: req.body.name !== undefined ? req.body.name : existing.name,
      start_work_date: req.body.start_work_date !== undefined ? req.body.start_work_date : existing.start_work_date,
    };
    const result = await salesPersonsService.updateSalesPersonByCode(code, body);
    if (!result) return res.status(404).json({ success: false, error: { message: "Sales person not found" } });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
}

export async function handleDelete(req, res) {
  try {
    const code = decodeURIComponent(req.params.code || "");
    const result = await salesPersonsService.deleteSalesPersonByCode(code);
    if (!result) return res.status(404).json({ success: false, error: { message: "Sales person not found" } });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}
