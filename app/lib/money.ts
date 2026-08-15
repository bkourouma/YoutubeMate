/**
 * A single call costs fractions of a cent, so a fixed two-decimal format would print
 * "$0.00" against real spending and make the ledger look broken. Precision grows as the
 * amount shrinks, and the scale stays readable once totals reach dollars.
 */
export function formatCost(value: number) {
  if (!value) return "$0";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}

export function formatTokens(value: number) {
  if (!value) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}
