/**
 * ZZERKOFF — GLOBAL DEFAULTS
 * These are fallbacks. Live values are managed in the admin panel
 * (/admin/settings) and read through `useSite()` in src/lib/settings.ts.
 */
export const SITE = {
  brand: "ZZERKOFF",
  tagline: "Objects for the Afterdark.",
  currencySymbol: "৳",
  currencyCode: "BDT",
  /** WhatsApp number in international format, digits only. */
  whatsappNumber: "8801410545930",
  instagramHandle: "@zzerkoff",
  instagramUrl: "https://www.instagram.com/zzerkoff/",
  email: "zzerkoff.official@gmail.com",
  location: "Dhaka, Bangladesh",
  delivery: "Dhaka 1-2 days. Outside Dhaka 2-4 days. Cash on delivery available.",
} as const;

export const formatPrice = (n: number | string, symbol: string = SITE.currencySymbol) =>
  `${symbol}${Number(n).toLocaleString("en-US")}`;

export const STOCK_OPTIONS = ["IN STOCK", "LOW STOCK", "PRE-ORDER", "SOLD OUT"] as const;

export function whatsappUrl(text: string, number: string = SITE.whatsappNumber) {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export function orderMessage(opts: {
  brand?: string;
  name: string;
  code: string;
  category: string;
  price: number | string;
  symbol?: string;
  size?: string | null;
  quantity: number;
}) {
  const symbol = opts.symbol ?? SITE.currencySymbol;
  return [
    `Hi ${opts.brand ?? SITE.brand},`,
    "",
    "I want to order this object:",
    "",
    `Product: ${opts.name}`,
    `Code: ${opts.code}`,
    `Category: ${opts.category}`,
    `Price: ${symbol}${Number(opts.price).toLocaleString("en-US")}`,
    `Size: ${opts.size || "—"}`,
    `Quantity: ${opts.quantity}`,
    "",
    "Please confirm availability.",
  ].join("\n");
}

export function restockMessage(name: string, code: string, brand: string = SITE.brand) {
  return [
    `Hi ${brand},`,
    "",
    "I am interested in this object:",
    "",
    `Product: ${name}`,
    `Code: ${code}`,
    "",
    "It is currently sold out.",
    "",
    "Please let me know when it becomes available again.",
  ].join("\n");
}

export function contactMessage(opts: {
  brand?: string;
  name: string;
  phone: string;
  message: string;
}) {
  return [
    `Hi ${opts.brand ?? SITE.brand},`,
    "",
    `Name: ${opts.name}`,
    `Phone: ${opts.phone}`,
    "",
    "Message:",
    opts.message,
  ].join("\n");
}
