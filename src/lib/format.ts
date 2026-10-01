export function formatINR(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatCompactINR(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 10_000_000) {
    return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  }
  if (abs >= 100_000) {
    return `₹${(value / 100_000).toFixed(1)} L`;
  }
  return formatINR(value);
}

export function formatQty(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

export function indianDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export function indianDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export function daysBetween(fromIso: string, to = new Date()): number {
  const from = new Date(fromIso).getTime();
  return Math.floor((to.getTime() - from) / 86_400_000);
}

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}
