import { z } from "zod";

// Validation: use business keys (customer_code, invoice_no), not primary keys.
export const CreateReceiptSchema = z.object({
  receipt_no: z.string().optional(),                        // optional → auto-generate
  customer_code: z.string().min(1, "Customer code is required"),
  receipt_date: z.string().min(8),                          // YYYY-MM-DD
  payment_method: z.enum(["cash", "bank_transfer", "check"]),
  payment_notes: z.string().optional().nullable(),
  line_items: z
    .array(
      z.object({
        id: z.coerce.number().int().optional(),             // receipt_line_item.id when editing
        invoice_no: z.string().min(1, "Invoice no is required"),
        amount_received_here: z.coerce.number().nonnegative(),
      }),
    )
    .min(1, "At least one line item is required"),
});
