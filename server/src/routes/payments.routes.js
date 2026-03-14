import { Router } from "express";
import * as c from "../controllers/paymets.controller.js";

const r = Router();
r.get("/list", c.listPayments);

export default r;
