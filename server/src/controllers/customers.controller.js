import * as customersService from "../services/customers.service.js";

export async function listCustomers(req, res) {
  try {
    const result = await customersService.listCustomers(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
}

export async function createCustomer(req, res) {
  try {
    const result = await customersService.createCustomer(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err?.message ?? String(err) });
  }
}

export async function updateCustomer(req, res) {
  try {
    const { id } = req.params;
    const result = await customersService.updateCustomer(id, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err?.message ?? String(err) });
  }
}

export async function deleteCustomer(req, res) {
  try {
    const { id } = req.params;
    const force = req.query.force === "true";
    const result = await customersService.deleteCustomer(id, { force });
    res.json(result);
  } catch (err) {
    res.status(err?.statusCode ?? 500).json({ error: err?.message ?? String(err) });
  }
}

export async function listCountries(_req, res) {
  try {
    const rows = await customersService.listCountries();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
}

export async function getCustomer(req, res) {
  try {
    const { id } = req.params;
    const row = await customersService.getCustomerById(id);
    if (!row) return res.status(404).json({ error: "Customer not found" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
}

