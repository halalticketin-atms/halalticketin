export type CreditAccountingInput = {
  balance: number;
  availableBalance?: number;
  usedCredits?: number;
  totalPurchased: number;
};

export type CreditAccountingSummary = {
  total: number;
  used: number;
  available: number;
  usedPercentage: number;
  availablePercentage: number;
  hasActivity: boolean;
};

const clampNonNegative = (value: number | null | undefined) =>
  Number.isFinite(value) ? Math.max(0, Number(value)) : 0;

export function getCreditAccounting(data: CreditAccountingInput): CreditAccountingSummary {
  const available = clampNonNegative(data.availableBalance ?? data.balance);
  const used =
    data.usedCredits === undefined
      ? clampNonNegative(data.totalPurchased - available)
      : clampNonNegative(data.usedCredits);
  // Held credits are an internal backend safety state and intentionally excluded
  // from the organiser-facing accounting: only available + used are surfaced.
  const total = available + used;
  const usedPercentage = total > 0 ? (used / total) * 100 : 0;
  const availablePercentage = total > 0 ? (available / total) * 100 : 0;

  return {
    total,
    used,
    available,
    usedPercentage,
    availablePercentage,
    hasActivity: total > 0,
  };
}
