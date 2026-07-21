import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Category } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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

export function weightedScore(categories: Category[]): number {
  // Weights: A=20%, B=25%, C=20%, D=20%, E=10%, F=5%
  const weights = [0.2, 0.25, 0.2, 0.2, 0.1, 0.05]
  return Math.round(
    categories.reduce((sum, cat, i) => sum + cat.score * (weights[i] ?? 0), 0)
  )
}
