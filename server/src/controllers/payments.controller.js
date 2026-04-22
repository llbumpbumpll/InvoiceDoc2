import * as paymentsService from "../services/payments.service.js";
import { CreatePaymentBodySchema } from "../models/payment.model.js";
import { sendList, sendCreated, sendOne, sendError } from "../utils/response.js";
import logger from "../utils/logger.js";

export async function listPayments(req, res) {
  try {
    const result = await paymentsService.listPayments(req.query);
    sendList(res, result);
  } catch (err) {
    logger.error("listPayments failed", { error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 500);
  }
}

export async function createPayment(req, res) {
  const parsed = CreatePaymentBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, "Validation failed", 400, "VALIDATION_ERROR", parsed.error.flatten());
  }
  try {
    const result = await paymentsService.createPayment(parsed.data);
    sendCreated(res, result);
  } catch (err) {
    logger.error("createPayment failed", { error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 400);
  }
}

export async function getPayment(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return sendError(res, "Invalid payment id", 400);
  }
  try {
    const result = await paymentsService.getPayment(id);
    if (!result) return sendError(res, "Payment not found", 404);
    sendOne(res, result);
  } catch (err) {
    logger.error("getPayment failed", { id: req.params.id, error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 500);
  }
}