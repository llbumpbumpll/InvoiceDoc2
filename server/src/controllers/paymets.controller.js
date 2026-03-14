import * as invoicesService from "../services/paymets.service.js";
import { sendList, sendError } from "../utils/response.js";
import logger from "../utils/logger.js";

export async function listPayments(req, res) {
  try {
    const result = await invoicesService.listPayments(req.query);
    sendList(res, result);
  } catch (err) {
    logger.error("listPayments failed", { error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 500);
  }
}