import * as productsService from "../services/products.service.js";

export async function listProducts(req, res) {
  try {
    const result = await productsService.listProducts(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
}

export async function createProduct(req, res) {
  try {
    const result = await productsService.createProduct(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err?.message ?? String(err) });
  }
}

export async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const result = await productsService.updateProduct(id, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err?.message ?? String(err) });
  }
}

export async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const force = req.query.force === "true";
    const result = await productsService.deleteProduct(id, { force });
    res.json(result);
  } catch (err) {
    res.status(err?.statusCode ?? 500).json({ error: err?.message ?? String(err) });
  }
}

export async function listUnits(_req, res) {
  try {
    const rows = await productsService.listUnits();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
}

export async function getProduct(req, res) {
  try {
    const { id } = req.params;
    const row = await productsService.getProductById(id);
    if (!row) return res.status(404).json({ error: "Product not found" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
}

