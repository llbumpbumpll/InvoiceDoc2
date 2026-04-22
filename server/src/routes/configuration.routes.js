import { Router } from "express";
import { handleGet, handleUpdate } from "../controllers/configuration.controller.js";

const router = Router();

router.get("/", handleGet);
router.put("/", handleUpdate);

export default router;
