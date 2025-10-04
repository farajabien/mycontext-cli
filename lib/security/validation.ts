import { z } from "zod";

// Email validation schema
export const emailSchema = z
  .string()
  .email("Invalid email format")
  .min(1, "Email is required")
  .max(255, "Email too long")
  .transform((email) => email.toLowerCase().trim());

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain lowercase, uppercase, and number"
  );

// Phone number validation schema
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
  .transform((phone) => phone.replace(/\s+/g, ""));

// UUID validation schema
export const uuidSchema = z.string().uuid("Invalid UUID format");

// Amount validation schema (for payments)
export const amountSchema = z
  .number()
  .positive("Amount must be positive")
  .max(999999.99, "Amount too large");

// API request validation schema
export const apiRequestSchema = z.object({
  type: z.string().min(1, "Request type is required"),
  context: z.string().optional(),
  options: z
    .object({
      useClaudeCodeSDK: z.boolean().optional(),
      useGemini: z.boolean().optional(),
      temperature: z.number().min(0).max(1).optional(),
      maxTokens: z.number().positive().optional(),
    })
    .optional(),
});

// User input sanitization
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .substring(0, 1000); // Limit length
}

// Validation helper functions
export async function validateEmail(email: string): Promise<boolean> {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
}

export async function validatePassword(password: string): Promise<boolean> {
  try {
    passwordSchema.parse(password);
    return true;
  } catch {
    return false;
  }
}

export async function validatePhone(phone: string): Promise<boolean> {
  try {
    phoneSchema.parse(phone);
    return true;
  } catch {
    return false;
  }
}

export async function validateUUID(uuid: string): Promise<boolean> {
  try {
    uuidSchema.parse(uuid);
    return true;
  } catch {
    return false;
  }
}

export async function validateAmount(amount: number): Promise<boolean> {
  try {
    amountSchema.parse(amount);
    return true;
  } catch {
    return false;
  }
}

// Type exports for use in other modules
export type EmailInput = z.infer<typeof emailSchema>;
export type PasswordInput = z.infer<typeof passwordSchema>;
export type PhoneInput = z.infer<typeof phoneSchema>;
export type UUIDInput = z.infer<typeof uuidSchema>;
export type AmountInput = z.infer<typeof amountSchema>;
export type APIRequest = z.infer<typeof apiRequestSchema>;
