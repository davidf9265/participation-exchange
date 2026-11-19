"use client";

import { useCallback, useEffect, useState } from "react";
import { getJson, type Listing, type RiskGrade } from "@/lib/api";
import {
	formatCompactMoney,
	formatDate,
	formatLoanType,
	formatRate,
	initialsOf,
	loanTypeCode,
	toNumber,
	tryCompareDecimals,
} from "@/lib/format";
import { PurchaseDialog } from "@/components/purchase-dialog";
import { VIEWER_CU_ID } from "@/lib/viewer";

const GRADES: RiskGrade[] = ["A", "B", "C", "D"];
const TERMS = [12, 24, 36, 48, 60, 84];

export default function ListingsPage() {
	const [riskGrade, setRiskGrade] = useState("");
	const [minYield, setMinYield] = useState("");
	const [maxTermMonths, setMaxTermMonths] = useState("");

	const [listings, setListings] = useState<Listing[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [purchasing, setPurchasing] = useState<Listing | null>(null);

	const load = useCallback(async () => {
		const params = new URLSearchParams();
		if (riskGrade) {
			params.set("riskGrade", riskGrade);
		}
		if (minYield) {
			params.set("minYield", minYield);
		}
		if (maxTermMonths) {
			params.set("maxTermMonths", maxTermMonths);
		}

		setError(null);
		try {
			setListings(await getJson<Listing[]>("/listings", params));
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
			setListings(null);
		}
	}, [riskGrade, minYield, maxTermMonths]);

	useEffect(() => {
		void load();
	}, [load]);

	function clearFilters() {
		setRiskGrade("");
		setMinYield("");
		setMaxTermMonths("");
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
						aria-pressed={riskGrade === ""}
						onClick={() => setRiskGrade("")}
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
							onChange={(event) =>
								setMinYield(event.target.value)
							}
						/>
					</div>

					<div className="field">
						<label htmlFor="maxTermMonths">Maximum term</label>
						<select
							id="maxTermMonths"
							value={maxTermMonths}
							onChange={(event) =>
								setMaxTermMonths(event.target.value)
							}
						>
							<option value="">Any term</option>
							{TERMS.map((term) => (
								<option key={term} value={term}>
									Up to {term} months
								</option>
							))}
						</select>
					</div>

					<button
						type="button"
						className="link-button"
						onClick={clearFilters}
					>
						Clear
					</button>
				</div>
			</div>

			{error ? (
				<div className="error">Could not load listings: {error}</div>
			) : null}

			{listings === null ? (
				error ? null : (
					<div className="panel state">Loading listings…</div>
				)
			) : (
				<div className="panel panel-scroll">
					{listings.length === 0 ? (
						<div className="state">
							No listings match these filters.
						</div>
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
									<th className="col-action" aria-label="Actions" />
								</tr>
							</thead>
							<tbody>
								{listings
									.filter((listing) => {
										if (!riskGrade) {
											return true;
										}
										return listing.riskGrade === riskGrade;
									})
									.map((listing) => (
										<tr key={listing.id}>
											<td>
												<div className="cell">
													<span className="tile">
														{loanTypeCode(
															listing.loanType,
														)}
													</span>
													<span className="stack">
														<span className="title">
															{listing.reference}
														</span>
														<span className="sub">
															{formatLoanType(
																listing.loanType,
															)}
														</span>
													</span>
												</div>
											</td>
											<td className="cell-clip">
												<div className="cell">
													<span className="avatar">
														{initialsOf(
															listing.sellerCu
																.name,
														)}
													</span>
													<span className="stack">
														<span className="title" title={listing.sellerCu.name}>
															{
																listing.sellerCu
																	.name
															}
														</span>
														<span className="sub">
															{
																listing.sellerCu
																	.state
															}{" "}
															· charter{" "}
															{
																listing.sellerCu
																	.charterNumber
															}
														</span>
													</span>
												</div>
											</td>
											<td>
												<span
													className={`badge badge-${listing.riskGrade}`}
												>
													{listing.riskGrade}
												</span>
											</td>
											<td className="num">
												<span className="yield">
													{formatRate(
														listing.yieldRate,
													)}
												</span>
											</td>
											<td className="num">
												{formatCompactMoney(
													listing.principalAmount,
												)}
											</td>
											<td className="num">
												{formatCompactMoney(
													listing.remainingAmount,
												)}
											</td>
											<td className="num">
												{listing.termMonths} mo
											</td>
											<td>
												{formatDate(
													listing.originatedAt,
												)}
											</td>
											<td>
												<span className="status">
													<span
														className="dot"
														aria-hidden
													/>
													Open
												</span>
											</td>
											<td className="col-action">
												<button
													type="button"
													className="button"
													disabled={buyBlockReason(listing) !== undefined}
													title={buyBlockReason(listing)}
													onClick={() => setPurchasing(listing)}
												>
													Buy
												</button>
											</td>
										</tr>
									))}
							</tbody>
						</table>
					)}
				</div>
			)}

			{purchasing ? (
				<PurchaseDialog
					key={purchasing.id}
					listing={purchasing}
					onClose={(reload) => {
						setPurchasing(null);
						if (reload) {
							void load();
						}
					}}
					onPurchased={() => {
						setPurchasing(null);
						void load();
					}}
				/>
			) : null}
		</>
	);
}

/** Why the Buy action is unavailable for a listing, or undefined if it is available. */
function buyBlockReason(listing: Listing): string | undefined {
	if (listing.sellerCu.id === VIEWER_CU_ID) {
		return "You cannot buy your own listing";
	}
	// A malformed balance is not blocked here; the server is the source of truth.
	const remaining = tryCompareDecimals(listing.remainingAmount, "0");
	if (remaining !== null && remaining <= 0) {
		return "No remaining balance";
	}
	return undefined;
}

function summarize(listings: Listing[] | null): string {
	if (listings === null) {
		return "Loan participations currently offered by selling credit unions.";
	}

	if (listings.length === 0) {
		return "No listings match these filters.";
	}

	const available = listings.reduce(
		(total, listing) => total + toNumber(listing.remainingAmount),
		0,
	);
	const averageYield =
		listings.reduce(
			(total, listing) => total + toNumber(listing.yieldRate),
			0,
		) / listings.length;

	return [
		`${listings.length} open ${listings.length === 1 ? "listing" : "listings"}`,
		`${formatCompactMoney(available)} available`,
		`${formatRate(averageYield)} avg yield`,
	].join(" · ");
}
