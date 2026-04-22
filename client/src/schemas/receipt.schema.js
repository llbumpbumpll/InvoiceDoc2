// Validation rules for receipt form (used with react-hook-form + zod)
import { z } from "zod";

export const receiptFormSchema = z.object({
  receipt_no: z.string().optional(),
  customer_code: z.string().min(1, "Customer should not be null"),
  receipt_date: z.string().min(1, "Date should not be null"),
  payment_method: z.enum(["cash", "bank_transfer", "check"]),
  payment_notes: z.string().optional(),
});
