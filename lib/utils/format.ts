export function formatCurrency(
  value: number | string,
  currency: string = "USD"
): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatMultiplier(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `${num.toFixed(1)}x`;
}

/** Map currency code to symbol for inline display (e.g. input suffixes) */
export function currencySymbol(currency: string = "USD"): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    CAD: "C$",
    AUD: "A$",
    SEK: "kr",
    NOK: "kr",
    DKK: "kr",
    BRL: "R$",
    JPY: "¥",
  };
  return symbols[currency] || currency;
}

export const SUPPORTED_CURRENCIES = [
  { code: "USD", label: "$ - USD" },
  { code: "EUR", label: "€ - EUR" },
  { code: "GBP", label: "£ - GBP" },
  { code: "CAD", label: "C$ - CAD" },
  { code: "AUD", label: "A$ - AUD" },
  { code: "SEK", label: "kr - SEK" },
  { code: "NOK", label: "kr - NOK" },
  { code: "DKK", label: "kr - DKK" },
  { code: "BRL", label: "R$ - BRL" },
  { code: "JPY", label: "¥ - JPY" },
] as const;
