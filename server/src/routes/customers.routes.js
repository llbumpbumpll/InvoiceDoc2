// Customer routes (เส้นทาง API สำหรับลูกค้า)
// Example usage: GET /api/customers
import { Router } from "express";
import * as c from "../controllers/customers.controller.js";

const r = Router();

// List customers with pagination, search, sort
r.get("/", c.listCustomers);
// Create customer (supports auto code)
r.post("/", c.createCustomer);
r.put("/:id", c.updateCustomer);
// DELETE customer (supports ?force=true)
r.delete("/:id", c.deleteCustomer);
r.get("/countries", c.listCountries);
// Get single customer (must be after /countries)
r.get("/:id", c.getCustomer);

export default r;
