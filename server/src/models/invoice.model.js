import { z } from "zod";

// Validation schema for creating/updating invoices
export const CreateInvoiceSchema = z.object({
  invoice_no: z.string().optional(), // Optional for auto-generation
  customer_id: z.number().int(),
  invoice_date: z.string().min(8), // YYYY-MM-DD
  vat_rate: z.number().min(0).max(1).default(0.07),
  line_items: z
    .array(
      z.object({
        product_id: z.number().int(),
        quantity: z.number().positive(),
        unit_price: z.number().nonnegative().optional(),
      }),
    )
    .min(1),
});

