import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format file size to human-readable format
export function formatFileSize(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 بايت";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["بايت", "كيلوبايت", "ميجابايت", "جيجابايت"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
