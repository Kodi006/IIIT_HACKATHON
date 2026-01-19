import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatConfidence(confidence: string): {
  color: string;
  bgColor: string;
  percentage: number;
} {
  const confidenceMap = {
    High: { color: "text-green-600", bgColor: "bg-green-100", percentage: 85 },
    Medium: { color: "text-yellow-600", bgColor: "bg-yellow-100", percentage: 60 },
    Low: { color: "text-red-600", bgColor: "bg-red-100", percentage: 30 },
  };

  return confidenceMap[confidence as keyof typeof confidenceMap] || confidenceMap.Low;
}
