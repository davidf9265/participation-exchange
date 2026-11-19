const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const date = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

const loanTypeCodes: Record<string, string> = {
  AUTO: 'AU',
  MORTGAGE: 'MG',
  COMMERCIAL_RE: 'CR',
  MEMBER_BUSINESS: 'MB',
  HELOC: 'HE',
  SOLAR: 'SO',
};

/** The API sends amounts and rates as exact decimal strings. */
export function toNumber(value: string | number): number {
  const parsed = typeof value === 'number' ? value : Number(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`Expected a numeric value, received ${JSON.stringify(value)}`);
  }

  return parsed;
}

const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

/** Amount typed by a user: non-negative, at most 2 decimal places. */
export function isDecimalAmount(value: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(value);
}

/**
 * Compares two non-negative decimal strings exactly (no floats).
 * Returns -1, 0 or 1.
 */
export function compareDecimals(a: string, b: string): number {
  if (!DECIMAL_PATTERN.test(a) || !DECIMAL_PATTERN.test(b)) {
    throw new Error(`Expected decimal strings, received ${JSON.stringify([a, b])}`);
  }

  const [aInt, aFrac = ''] = a.split('.');
  const [bInt, bFrac = ''] = b.split('.');
  const width = Math.max(aFrac.length, bFrac.length);
  const x = BigInt(aInt + aFrac.padEnd(width, '0'));
  const y = BigInt(bInt + bFrac.padEnd(width, '0'));

  if (x === y) {
    return 0;
  }
  return x < y ? -1 : 1;
}

/**
 * Like `compareDecimals`, but returns null for malformed input instead of throwing.
 * Use it in render paths where the server is the source of truth for odd values.
 */
export function tryCompareDecimals(a: string, b: string): number | null {
  try {
    return compareDecimals(a, b);
  } catch {
    return null;
  }
}

export function formatMoney(value: string | number): string {
  return currency.format(toNumber(value));
}

export function formatCompactMoney(value: string | number): string {
  return compactCurrency.format(toNumber(value));
}

export function formatRate(value: string | number): string {
  return `${toNumber(value).toFixed(2)}%`;
}

export function formatDate(value: string): string {
  return date.format(new Date(value));
}

export function formatLoanType(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

export function loanTypeCode(value: string): string {
  return loanTypeCodes[value] ?? value.slice(0, 2);
}

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter((word) => /^[A-Z]/.test(word))
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('');
}
