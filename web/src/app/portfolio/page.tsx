'use client';

import { useEffect, useState } from 'react';
import { getJson, type Participation } from '@/lib/api';
import {
  formatCompactMoney,
  formatDate,
  formatLoanType,
  formatMoney,
  formatRate,
  initialsOf,
  loanTypeCode,
  toNumber,
} from '@/lib/format';
import { VIEWER_CU } from '@/lib/viewer';

export default function PortfolioPage() {
  const [participations, setParticipations] = useState<Participation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJson<Participation[]>('/portfolio')
      .then(setParticipations)
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause));
      });
  }, []);

  return (
    <>
      <h1>Portfolio</h1>
      <p className="lede">Positions bought by {VIEWER_CU.name} through the exchange.</p>

      {error ? <div className="error">Could not load portfolio: {error}</div> : null}

      {participations === null ? (
        error ? null : (
          <div className="panel state">Loading portfolio…</div>
        )
      ) : (
        <>
          <div className="metrics">
            <div className="panel metric">
              <span className="value">{formatCompactMoney(totalInvested(participations))}</span>
              <span className="label">Total invested</span>
            </div>
            <div className="panel metric">
              <span className="value">{participations.length}</span>
              <span className="label">Active positions</span>
            </div>
            <div className="panel metric">
              <span className="value">{countCounterparties(participations)}</span>
              <span className="label">Counterparties</span>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Holdings</h2>
              <span className="count">
                {participations.length} {participations.length === 1 ? 'position' : 'positions'}
              </span>
            </div>

            {participations.length === 0 ? (
              <div className="state">No participations bought yet.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Counterparty</th>
                    <th>Grade</th>
                    <th className="num">Invested</th>
                    <th className="num">Yield</th>
                    <th className="num">Term</th>
                    <th>Purchased</th>
                  </tr>
                </thead>
                <tbody>
                  {participations.map(({ id, amount, purchasedAt, listing }) => (
                    <tr key={id}>
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
                      <td className="num">{formatMoney(amount)}</td>
                      <td className="num">
                        <span className="yield">{formatRate(listing.yieldRate)}</span>
                      </td>
                      <td className="num">{listing.termMonths} mo</td>
                      <td>{formatDate(purchasedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </>
  );
}

function totalInvested(participations: Participation[]): number {
  return participations.reduce((total, participation) => total + toNumber(participation.amount), 0);
}

function countCounterparties(participations: Participation[]): number {
  return new Set(participations.map((participation) => participation.listing.sellerCu.id)).size;
}
