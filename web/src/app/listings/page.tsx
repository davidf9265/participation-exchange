'use client';

import { useCallback, useEffect, useState } from 'react';
import { getJson, type Listing, type RiskGrade } from '@/lib/api';
import {
  formatCompactMoney,
  formatDate,
  formatLoanType,
  formatRate,
  initialsOf,
  loanTypeCode,
  toNumber,
} from '@/lib/format';

const GRADES: RiskGrade[] = ['A', 'B', 'C', 'D'];
const TERMS = [12, 24, 36, 48, 60, 84];

export default function ListingsPage() {
  const [riskGrade, setRiskGrade] = useState('');
  const [minYield, setMinYield] = useState('');
  const [maxTermMonths, setMaxTermMonths] = useState('');

  const [listings, setListings] = useState<Listing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (riskGrade) {
      params.set('riskGrade', riskGrade);
    }
    if (minYield) {
      params.set('minYield', minYield);
    }
    if (maxTermMonths) {
      params.set('maxTermMonths', maxTermMonths);
    }

    setError(null);
    try {
      setListings(await getJson<Listing[]>('/listings', params));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setListings(null);
    }
  }, [riskGrade, minYield, maxTermMonths]);

  useEffect(() => {
    void load();
  }, [load]);

  function clearFilters() {
    setRiskGrade('');
    setMinYield('');
    setMaxTermMonths('');
  }

  return (
    <>
      <h1>Marketplace</h1>
      <p className="lede">{summarize(listings)}</p>

      <div className="toolbar">
        <div className="chips">
          <button
            type="button"
            className="chip"
            aria-pressed={riskGrade === ''}
            onClick={() => setRiskGrade('')}
          >
            All grades
          </button>
          {GRADES.map((grade) => (
            <button
              key={grade}
              type="button"
              className="chip"
              aria-pressed={riskGrade === grade}
              onClick={() => setRiskGrade(grade)}
            >
              Grade {grade}
            </button>
          ))}
        </div>

        <div className="inputs">
          <div className="field">
            <label htmlFor="minYield">Minimum yield</label>
            <input
              id="minYield"
              type="number"
              step="0.05"
              min="0"
              placeholder="e.g. 6"
              value={minYield}
              onChange={(event) => setMinYield(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="maxTermMonths">Maximum term</label>
            <select
              id="maxTermMonths"
              value={maxTermMonths}
              onChange={(event) => setMaxTermMonths(event.target.value)}
            >
              <option value="">Any term</option>
              {TERMS.map((term) => (
                <option key={term} value={term}>
                  Up to {term} months
                </option>
              ))}
            </select>
          </div>

          <button type="button" className="link-button" onClick={clearFilters}>
            Clear
          </button>
        </div>
      </div>

      {error ? <div className="error">Could not load listings: {error}</div> : null}

      {listings === null ? (
        error ? null : (
          <div className="panel state">Loading listings…</div>
        )
      ) : (
        <div className="panel">
          {listings.length === 0 ? (
            <div className="state">No listings match these filters.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Listing</th>
                  <th>Counterparty</th>
                  <th>Grade</th>
                  <th className="num">Yield</th>
                  <th className="num">Offered</th>
                  <th className="num">Remaining</th>
                  <th className="num">Term</th>
                  <th>Originated</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing.id}>
                    <td>
                      <div className="cell">
                        <span className="tile">{loanTypeCode(listing.loanType)}</span>
                        <span className="stack">
                          <span className="title">{listing.reference}</span>
                          <span className="sub">{formatLoanType(listing.loanType)}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="cell">
                        <span className="avatar">{initialsOf(listing.sellerCu.name)}</span>
                        <span className="stack">
                          <span className="title">{listing.sellerCu.name}</span>
                          <span className="sub">
                            {listing.sellerCu.state} · charter {listing.sellerCu.charterNumber}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${listing.riskGrade}`}>
                        {listing.riskGrade}
                      </span>
                    </td>
                    <td className="num">
                      <span className="yield">{formatRate(listing.yieldRate)}</span>
                    </td>
                    <td className="num">{formatCompactMoney(listing.principalAmount)}</td>
                    <td className="num">{formatCompactMoney(listing.remainingAmount)}</td>
                    <td className="num">{listing.termMonths} mo</td>
                    <td>{formatDate(listing.originatedAt)}</td>
                    <td>
                      <span className="status">
                        <span className="dot" aria-hidden />
                        Open
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}

function summarize(listings: Listing[] | null): string {
  if (listings === null) {
    return 'Loan participations currently offered by selling credit unions.';
  }

  if (listings.length === 0) {
    return 'No listings match these filters.';
  }

  const available = listings.reduce((total, listing) => total + toNumber(listing.remainingAmount), 0);
  const averageYield =
    listings.reduce((total, listing) => total + toNumber(listing.yieldRate), 0) / listings.length;

  return [
    `${listings.length} open ${listings.length === 1 ? 'listing' : 'listings'}`,
    `${formatCompactMoney(available)} available`,
    `${formatRate(averageYield)} avg yield`,
  ].join(' · ');
}
