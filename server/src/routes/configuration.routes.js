import { Router } from "express";
import { handleGetConfig } from "../controllers/configuration.controller.js";

const router = Router();
router.get("/:key", handleGetConfig);

export default router;
