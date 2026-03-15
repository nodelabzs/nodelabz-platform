export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat(currency === "CRC" ? "es-CR" : "en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}
