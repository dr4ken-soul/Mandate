/**
 * Display formatters.
 *
 * These are the only place a number becomes a string for a reader. They never
 * decide anything: every comparison in this repository happens on a bigint or
 * on an integer count, and only the output of that decision is formatted here.
 */

const USDSO_DECIMALS = 18;

/**
 * Format a quote amount held as a base ten integer with 18 decimals.
 *
 * @param value The raw integer, or a decimal string of one.
 * @param decimals How many decimals to show.
 * @returns For example `200.00`.
 */
export function formatQuote(value: bigint | string, decimals = 2): string {
  const raw = typeof value === "bigint" ? value : BigInt(value);
  const negative = raw < 0n;
  const magnitude = negative ? -raw : raw;
  const scale = 10n ** BigInt(USDSO_DECIMALS);
  const whole = magnitude / scale;
  const fraction = magnitude % scale;
  const fractionText = fraction.toString().padStart(USDSO_DECIMALS, "0").slice(0, decimals);
  const sign = negative ? "-" : "";
  return `${sign}${whole.toString()}.${fractionText}`;
}

/**
 * Format a leverage figure held in basis points.
 *
 * @param bps The basis points, for example 300.
 * @returns For example `3.00x`.
 */
export function formatLeverage(bps: number | bigint): string {
  const value = typeof bps === "bigint" ? bps : BigInt(bps);
  const whole = value / 10_000n;
  const fraction = (value % 10_000n).toString().padStart(4, "0").slice(0, 2);
  return `${whole.toString()}.${fraction}x`;
}

/**
 * Format a raw base unit quantity with the market's own decimals.
 *
 * @param value The raw integer.
 * @param decimals The market's base decimals.
 */
export function formatBase(value: bigint | string, decimals: number): string {
  const raw = typeof value === "bigint" ? value : BigInt(value);
  const negative = raw < 0n;
  const magnitude = negative ? -raw : raw;
  const scale = 10n ** BigInt(decimals);
  const whole = magnitude / scale;
  const fraction = magnitude % scale;
  const fractionText = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  const sign = negative ? "-" : "";
  return fractionText.length > 0 ? `${sign}${whole.toString()}.${fractionText}` : `${sign}${whole.toString()}`;
}

/**
 * Truncate a hash for display, keeping four characters on each side.
 *
 * @param hash The 0x prefixed hash.
 * @returns For example `0x4e03…c45`.
 */
export function shortHash(hash: string | null | undefined): string {
  if (!hash || hash.length < 12) return hash ?? "";
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

/**
 * Truncate an address for display, keeping four characters on each side.
 */
export function shortAddress(address: string | null | undefined): string {
  if (!address || address.length < 12) return address ?? "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Format a unix timestamp as a UTC date.
 *
 * @param seconds The unix timestamp.
 * @returns For example `1 Nov 2026`.
 */
export function formatExpiry(seconds: number): string {
  const date = new Date(seconds * 1000);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
