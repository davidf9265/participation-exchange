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

/**
 * Error from a failed API call. `status` is 0 when no response was received
 * (network error), so callers can tell "the server said no" from "we don't know".
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };

    if (typeof body.message === 'string') {
      return body.message;
    }
    if (Array.isArray(body.message)) {
      return body.message.join(', ');
    }
  } catch {
    // Body is not JSON; fall through to the status line.
  }

  return `${response.status} ${response.statusText}`.trim();
}

export async function postJson<T>(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  const url = apiUrl(path);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new ApiError(0, `Network error: ${detail}`);
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
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
  updatedAt: string;
  sellerCu: CreditUnion;
};

export type Participation = {
  id: string;
  listingId: string;
  buyerCuId: string;
  amount: Decimal;
  yieldRate: Decimal;
  termMonths: number;
  purchasedAt: string;
  createdAt: string;
  updatedAt: string;
  idempotencyKey: string;
  listing: Listing;
};
