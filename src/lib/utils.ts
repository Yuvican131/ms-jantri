import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number | string): string {
  const number = Number(num);
  if (isNaN(number)) {
    return String(num);
  }
  // Return integer if it's a whole number, otherwise format to 2 decimal places
  return number % 1 === 0 ? number.toString() : number.toFixed(2);
}
