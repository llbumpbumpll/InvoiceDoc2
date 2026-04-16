import { Router } from "express";
import { handleList, handleGet, handleCreate, handleUpdate, handleDelete } from "../controllers/salesPersons.controller.js";

const router = Router();
router.get("/", handleList);
router.get("/:code", handleGet);
router.post("/", handleCreate);
router.put("/:code", handleUpdate);
router.delete("/:code", handleDelete);

export default router;
