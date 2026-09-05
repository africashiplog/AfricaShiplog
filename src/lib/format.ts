const CURRENCY_LABEL_AR: Record<string, string> = {
  MRU: "أوقية",
  XOF: "ف.س",
};

/** Formats a monetary amount with thousands separators and the Arabic currency label. */
export function formatMoney(value: string | number, currency = "MRU"): string {
  const num = typeof value === "string" ? Number(value) : value;
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(num);
  const label = CURRENCY_LABEL_AR[currency] ?? currency;
  return `${formatted} ${label}`;
}

export function formatNumber(value: string | number): string {
  const num = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("en-US").format(num);
}
