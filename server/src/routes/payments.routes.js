import { Router } from "express";
import * as c from "../controllers/payments.controller.js";

const r = Router();

r.get("/", c.listPayments);

r.post("/", c.createPayment);

r.get("/:id", c.getPayment);

export default r;