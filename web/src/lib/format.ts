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
