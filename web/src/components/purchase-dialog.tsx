"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError, getJson, postJson, type Listing, type Participation } from "@/lib/api";
import {
	compareDecimals,
	formatMoney,
	formatRate,
	isDecimalAmount,
	tryCompareDecimals,
} from "@/lib/format";
import { uuidv4 } from "@/lib/uuid";

type PurchaseDialogProps = {
	listing: Listing;
	/** `reload` is true when any purchase attempt failed, so the marketplace may be stale. */
	onClose: (reload: boolean) => void;
	onPurchased: () => void;
};

/** Answers that mean nothing was bought. Every other outcome keeps the key. */
const DEFINITIVE_STATUSES = new Set([400, 404, 409, 422]);

function validateAmount(amount: string, remaining: string): string | null {
	if (amount === "") {
		return null;
	}
	if (!isDecimalAmount(amount)) {
		return "Enter an amount with up to 2 decimal places.";
	}
	if (compareDecimals(amount, "0") <= 0) {
		return "Amount must be greater than 0.";
	}
	// If the remaining balance is malformed, skip the client-side maximum; the server checks it.
	const overRemaining = tryCompareDecimals(amount, remaining);
	if (overRemaining !== null && overRemaining > 0) {
		return `Amount cannot exceed the remaining ${formatMoney(remaining)}.`;
	}
	return null;
}

/** Appends a sentence, adding a period only when the message does not already end one. */
function withSentence(message: string, sentence: string): string {
	return /[.!?]$/.test(message) ? `${message} ${sentence}` : `${message}. ${sentence}`;
}

export function PurchaseDialog({ listing: initialListing, onClose, onPurchased }: PurchaseDialogProps) {
	// Local copy so a 409/422 can refresh the available amount shown here.
	const [listing, setListing] = useState(initialListing);
	const [amount, setAmount] = useState("");
	// One key per purchase attempt: created when the dialog opens (mount), reused on
	// retries after an uncertain outcome, regenerated on amount change or definitive results.
	const [idempotencyKey, setIdempotencyKey] = useState(uuidv4);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// Last attempt ended without a definitive answer (network, 5xx, or other non-4xx): retry with same key.
	// While set, the amount is locked so the only options are Retry or Close.
	const [uncertain, setUncertain] = useState(false);
	// Sticky until the dialog closes: some attempt failed, so the listing may have changed.
	const [needsReload, setNeedsReload] = useState(false);

	const validationError = validateAmount(amount, listing.remainingAmount);
	const canSubmit = amount !== "" && validationError === null && !submitting;

	function handleClose() {
		if (submitting) {
			return;
		}
		onClose(needsReload);
	}

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				handleClose();
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	});

	function changeAmount(value: string) {
		if (uncertain || submitting || value === amount) {
			return;
		}
		setAmount(value);
		setIdempotencyKey(uuidv4());
		setError(null);
	}

	async function refreshListing() {
		try {
			setListing(await getJson<Listing>(`/listings/${listing.id}`));
		} catch {
			// Keep the last known amount. Closing the dialog reloads the marketplace anyway.
		}
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!canSubmit) {
			return;
		}

		setSubmitting(true);
		setError(null);
		try {
			await postJson<Participation>(
				`/listings/${listing.id}/participations`,
				{ amount },
				{ "Idempotency-Key": idempotencyKey },
			);
			onPurchased();
		} catch (cause) {
			setNeedsReload(true);
			const message = cause instanceof Error ? cause.message : String(cause);
			const status = cause instanceof ApiError ? cause.status : 0;

			if (DEFINITIVE_STATUSES.has(status)) {
				// Definitive answer: nothing was bought. A new attempt needs a new key.
				setError(message);
				setUncertain(false);
				setIdempotencyKey(uuidv4());
				if (status === 409 || status === 422) {
					// The available amount probably changed; show the current one so Max is not stale.
					void refreshListing();
				}
			} else if (status === 503) {
				setError("The server did not complete the purchase. It is safe to retry.");
				setUncertain(true);
			} else {
				// No answer, or another non-definitive status: the purchase may or may not exist. Keep the key.
				setError(
					withSentence(
						message,
						"The result is unknown; retry to confirm it or close to refresh the listing.",
					),
				);
				setUncertain(true);
			}
		} finally {
			setSubmitting(false);
		}
	}

	const showValidation = validationError !== null;

	return (
		<div
			className="dialog-backdrop"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) {
					handleClose();
				}
			}}
		>
			<div className="panel dialog" role="dialog" aria-modal="true" aria-labelledby="purchase-dialog-title">
				<div className="panel-head">
					<h2 id="purchase-dialog-title">Buy participation</h2>
				</div>

				<div className="dialog-body">
					<dl className="dialog-summary">
						<div>
							<dt>Reference</dt>
							<dd>{listing.reference}</dd>
						</div>
						<div>
							<dt>Seller</dt>
							<dd>{listing.sellerCu.name}</dd>
						</div>
						<div>
							<dt>Grade</dt>
							<dd>
								<span className={`badge badge-${listing.riskGrade}`}>{listing.riskGrade}</span>
							</dd>
						</div>
						<div>
							<dt>Yield</dt>
							<dd>{formatRate(listing.yieldRate)}</dd>
						</div>
						<div>
							<dt>Term</dt>
							<dd>{listing.termMonths} mo</dd>
						</div>
						<div>
							<dt>Available</dt>
							<dd>{formatMoney(listing.remainingAmount)}</dd>
						</div>
					</dl>

					<form className="dialog-form" onSubmit={submit}>
						<div className="field">
							<label htmlFor="purchase-amount">Amount</label>
							<div className="amount-row">
								<input
									id="purchase-amount"
									type="text"
									inputMode="decimal"
									autoComplete="off"
									placeholder="0.00"
									value={amount}
									aria-invalid={showValidation}
									aria-describedby={showValidation ? "purchase-amount-error" : undefined}
									disabled={submitting || uncertain}
									onChange={(event) => changeAmount(event.target.value)}
								/>
								<button
									type="button"
									className="link-button"
									disabled={submitting || uncertain}
									onClick={() => changeAmount(listing.remainingAmount)}
								>
									Max
								</button>
							</div>
						</div>

						{showValidation ? (
							<p id="purchase-amount-error" className="field-error">
								{validationError}
							</p>
						) : null}

						{error ? (
							<div className="error dialog-error" role="alert">
								{error}
							</div>
						) : null}

						<div className="dialog-actions">
							<button
								type="button"
								className="button"
								disabled={submitting}
								onClick={handleClose}
							>
								{uncertain ? "Close" : "Cancel"}
							</button>
							<button type="submit" className="button button-primary" disabled={!canSubmit}>
								{submitting ? "Sending…" : uncertain ? "Retry" : "Confirm purchase"}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
