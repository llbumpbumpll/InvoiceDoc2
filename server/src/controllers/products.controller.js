import * as productsService from "../services/products.service.js";
import { sendList, sendData, sendOne, sendCreated, sendOk, sendError } from "../utils/response.js";

export async function listProducts(req, res) {
  try {
    const result = await productsService.listProducts(req.query);
    sendList(res, result);
  } catch (err) {
    sendError(res, err?.message ?? String(err), 500);
  }
}

export async function createProduct(req, res) {
  try {
    const result = await productsService.createProduct(req.body);
    sendCreated(res, result);
  } catch (err) {
    sendError(res, err?.message ?? String(err), 400);
  }
}

export async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const result = await productsService.updateProduct(id, req.body);
    sendOk(res, result);
  } catch (err) {
    sendError(res, err?.message ?? String(err), 400);
  }
}

export async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const force = req.query.force === "true";
    const result = await productsService.deleteProduct(id, { force });
    sendOk(res, result);
  } catch (err) {
    sendError(res, err?.message ?? String(err), err?.statusCode ?? 500);
  }
}

export async function listUnits(_req, res) {
  try {
    const result = await productsService.listUnits();
    sendData(res, result.data);
  } catch (err) {
    sendError(res, err?.message ?? String(err), 500);
  }
}

export async function getProduct(req, res) {
  try {
    const { id } = req.params;
    const row = await productsService.getProductById(id);
    if (!row) return sendError(res, "Product not found", 404);
    sendOne(res, row);
  } catch (err) {
    sendError(res, err?.message ?? String(err), 500);
  }
}
