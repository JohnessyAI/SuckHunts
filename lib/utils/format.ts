const CRYPTO_CODES = new Set(["BTC", "ETH", "LTC", "DOGE", "SOL", "XRP", "USDT", "USDC"]);

export function formatCurrency(
  value: number | string,
  currency: string = "USD"
): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (CRYPTO_CODES.has(currency)) {
    const sym = currencySymbol(currency);
    return `${sym}${num.toFixed(2)}`;
  }
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
    BTC: "₿",
    ETH: "Ξ",
    LTC: "Ł",
    DOGE: "Ð",
    SOL: "◎",
    XRP: "✕",
    USDT: "₮",
    USDC: "$",
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
  { code: "BTC", label: "₿ - BTC" },
  { code: "ETH", label: "Ξ - ETH" },
  { code: "LTC", label: "Ł - LTC" },
  { code: "DOGE", label: "Ð - DOGE" },
  { code: "SOL", label: "◎ - SOL" },
  { code: "XRP", label: "✕ - XRP" },
  { code: "USDT", label: "₮ - USDT" },
  { code: "USDC", label: "$ - USDC" },
] as const;
