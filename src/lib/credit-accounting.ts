export type CreditAccountingInput = {
  balance: number;
  availableBalance?: number;
  heldCredits?: number;
  usedCredits?: number;
  totalPurchased: number;
};

export type CreditAccountingSummary = {
  total: number;
  used: number;
  held: number;
  available: number;
  usedPercentage: number;
  heldPercentage: number;
  availablePercentage: number;
  hasActivity: boolean;
};

const clampNonNegative = (value: number | null | undefined) =>
  Number.isFinite(value) ? Math.max(0, Number(value)) : 0;

export function getCreditAccounting(data: CreditAccountingInput): CreditAccountingSummary {
  const available = clampNonNegative(data.availableBalance ?? data.balance);
  const held = clampNonNegative(data.heldCredits);
  const used =
    data.usedCredits === undefined
      ? clampNonNegative(data.totalPurchased - available)
      : clampNonNegative(data.usedCredits);
  const totalPurchased = clampNonNegative(data.totalPurchased);
  const total = Math.max(totalPurchased, available + held + used);
  const usedPercentage = total > 0 ? (used / total) * 100 : 0;
  const heldPercentage = total > 0 ? (held / total) * 100 : 0;
  const availablePercentage = total > 0 ? (available / total) * 100 : 0;

  return {
    total,
    used,
    held,
    available,
    usedPercentage,
    heldPercentage,
    availablePercentage,
    hasActivity: total > 0,
  };
}
