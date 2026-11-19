const baseUrl = process.env.NEXT_PUBLIC_API_URL;

export function apiUrl(path: string, params?: URLSearchParams): string {
  if (!baseUrl) {
    throw new Error(
      'NEXT_PUBLIC_API_URL is not set. Copy .env.example to .env and restart docker compose.',
    );
  }

  const query = params && params.size > 0 ? `?${params.toString()}` : '';
  return `${baseUrl}${path}${query}`;
}

export async function getJson<T>(path: string, params?: URLSearchParams): Promise<T> {
  const response = await fetch(apiUrl(path, params));

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export type RiskGrade = 'A' | 'B' | 'C' | 'D';

export type CreditUnion = {
  id: string;
  name: string;
  charterNumber: string;
  state: string;
};

/**
 * Amounts and rates are exact decimals in the database, so the API sends them as
 * strings. Convert with the helpers in `lib/format` rather than doing arithmetic
 * on them directly.
 */
export type Decimal = string;

export type Listing = {
  id: string;
  reference: string;
  loanType: string;
  principalAmount: Decimal;
  remainingAmount: Decimal;
  yieldRate: Decimal;
  termMonths: number;
  riskGrade: RiskGrade;
  status: 'OPEN' | 'FUNDED';
  originatedAt: string;
  sellerCu: CreditUnion;
};

export type Participation = {
  id: string;
  amount: Decimal;
  purchasedAt: string;
  listing: Listing;
};
