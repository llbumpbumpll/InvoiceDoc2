// Product routes (เส้นทาง API สำหรับสินค้า)
// Example usage: GET /api/products
import { Router } from "express";
import * as c from "../controllers/products.controller.js";

const r = Router();

// List products with pagination, search, sort
r.get("/", c.listProducts);
r.post("/", c.createProduct);
r.put("/:id", c.updateProduct);
// DELETE product (supports ?force=true)
r.delete("/:id", c.deleteProduct);
r.get("/units", c.listUnits);
// Get single product (must be after /units)
r.get("/:id", c.getProduct);

export default r;
