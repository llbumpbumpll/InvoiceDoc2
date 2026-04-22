import { z } from "zod";

export const PaymentSchema = z.object({
  id: z.number().int(),
  invoice_id: z.number().int(),
  payment_date: z.string().min(8),
  amount: z.number().positive(),
  method: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export const CreatePaymentBodySchema = z.object({
  invoice_id: z.coerce.number().int(),
  payment_date: z.string().min(8),
  amount: z.coerce.number().positive(),
  method: z.string().optional(),
  note: z.string().optional(),
});