import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Tier thresholds are locked — never override, always derive from score.
export function tierColor(score: number): string {
  if (score >= 85) return "#1BA85A" // Strong
  if (score >= 70) return "#F2A60C" // Moderate
  if (score >= 60) return "#E24A36" // Weak
  return "#C0392B" // Critical
}

export function tierLabel(score: number): string {
  if (score >= 85) return "Strong"
  if (score >= 70) return "Moderate"
  if (score >= 60) return "Weak"
  return "Critical"
}
