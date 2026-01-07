import { z } from 'zod';

export const transactionSchema = z.object({
    type: z.enum(['income', 'expense'], {
        required_error: "Transaction type is required",
    }),
    amount: z.number({
        required_error: "Amount is required",
        invalid_type_error: "Amount must be a number",
    }).positive("Amount must be greater than 0")
        .max(1000000000, "Amount is too large"),
    category: z.string({
        required_error: "Category is required",
    }).min(1, "Category cannot be empty")
        .max(50, "Category name is too long"),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date format",
    }),
    note: z.string().max(500, "Note cannot exceed 500 characters").optional(),
});
