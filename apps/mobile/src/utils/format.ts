const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats a signed amount as e.g. "-$85.40" or "+$3,200.00" when `signed` is set. */
export function formatCurrency(amount: number, { signed = false }: { signed?: boolean } = {}): string {
  const abs = Math.abs(amount);
  const formatted = currencyFormatter.format(abs);
  if (amount < 0) return `-${formatted}`;
  if (signed && amount > 0) return `+${formatted}`;
  return formatted;
}

const wholeCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Envelope allocation figures are conventionally shown as whole dollars, e.g. "$1,800 of $1,800". */
export function formatWholeCurrency(amount: number): string {
  return wholeCurrencyFormatter.format(Math.round(amount));
}

export function formatMonthLabel(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
