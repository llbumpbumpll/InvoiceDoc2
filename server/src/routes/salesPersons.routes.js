import { Router } from "express";
import { handleList, handleGet, handleCreate, handleUpdate, handleDelete } from "../controllers/salesPersons.controller.js";

const router = Router();

// List and create
router.get("/", handleList);
router.post("/", handleCreate);

// Get/update/delete by business key (code)
router.get("/:code", handleGet);
router.put("/:code", handleUpdate);
router.delete("/:code", handleDelete);

export default router;
