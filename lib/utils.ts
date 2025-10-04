import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitizes a group name for use as a directory or route segment.
 * - Lowercase
 * - Replace spaces and & with dashes
 * - Remove all other special characters
 * - Collapse multiple dashes
 * - Trim leading/trailing dashes
 */
export function sanitizeGroupName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*&\s*/g, "-") // Replace spaces and & with dash
    .replace(/[^a-z0-9-]/g, "") // Remove all non-alphanumeric/dash
    .replace(/-+/g, "-") // Collapse multiple dashes
    .replace(/^-+|-+$/g, ""); // Trim leading/trailing dashes
}
