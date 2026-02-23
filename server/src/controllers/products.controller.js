import * as productsService from "../services/products.service.js";
import { CreateProductBodySchema, UpdateProductBodySchema } from "../models/product.model.js";
import { sendList, sendData, sendOne, sendCreated, sendOk, sendError } from "../utils/response.js";
import logger from "../utils/logger.js";

export async function listProducts(req, res) {
  try {
    const result = await productsService.listProducts(req.query);
    sendList(res, result);
  } catch (err) {
    logger.error("listProducts failed", { error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 500);
  }
}

export async function createProduct(req, res) {
  const parsed = CreateProductBodySchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, "Validation failed", 400, "VALIDATION_ERROR", parsed.error.flatten());
  try {
    const result = await productsService.createProduct(parsed.data);
    sendCreated(res, result);
  } catch (err) {
    logger.error("createProduct failed", { error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 400);
  }
}

export async function updateProduct(req, res) {
  const parsed = UpdateProductBodySchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, "Validation failed", 400, "VALIDATION_ERROR", parsed.error.flatten());
  try {
    const code = decodeURIComponent(req.params.code || "");
    const existing = await productsService.getProductByCode(code);
    if (!existing) return sendError(res, "Product not found", 404);
    // Merge so partial body does not overwrite other fields with undefined → NULL in DB
    const body = {
      code: parsed.data.code !== undefined ? parsed.data.code : existing.code,
      name: parsed.data.name !== undefined ? parsed.data.name : existing.name,
      units_id: parsed.data.units_id !== undefined ? parsed.data.units_id : existing.units_id,
      unit_price: parsed.data.unit_price !== undefined ? parsed.data.unit_price : existing.unit_price,
    };
    const result = await productsService.updateProductByCode(code, body);
    sendOk(res, result);
  } catch (err) {
    logger.error("updateProduct failed", { code: req.params.code, error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 400);
  }
}

export async function deleteProduct(req, res) {
  try {
    const code = decodeURIComponent(req.params.code || "");
    const force = req.query.force === "true";
    const result = await productsService.deleteProductByCode(code, { force });
    if (!result) return sendError(res, "Product not found", 404);
    sendOk(res, result);
  } catch (err) {
    logger.error("deleteProduct failed", { code: req.params.code, error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), err?.statusCode ?? 500);
  }
}

export async function listUnits(_req, res) {
  try {
    const result = await productsService.listUnits();
    sendData(res, result.data);
  } catch (err) {
    logger.error("listUnits failed", { error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 500);
  }
}

export async function getProduct(req, res) {
  try {
    const code = decodeURIComponent(req.params.code || "");
    const row = await productsService.getProductByCode(code);
    if (!row) return sendError(res, "Product not found", 404);
    sendOne(res, row);
  } catch (err) {
    logger.error("getProduct failed", { code: req.params.code, error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 500);
  }
}
