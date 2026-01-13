import { fromSmallestUnit, toSmallestUnit } from './fees';

export type StripeFeeConfig = {
    percent: number;
    fixed: number;
};

const DEFAULT_STRIPE_FEE: StripeFeeConfig = {
    percent: Number(process.env.NEXT_PUBLIC_STRIPE_FEE_PERCENT ?? '0.029'),
    fixed: Number(process.env.NEXT_PUBLIC_STRIPE_FEE_FIXED ?? '0.30')
};

const STRIPE_FEE_CONFIG: Record<string, StripeFeeConfig> = {
    GBP: { percent: 0.015, fixed: 0.20 },
    EUR: { percent: 0.015, fixed: 0.25 },
    USD: { percent: 0.029, fixed: 0.30 },
    CAD: { percent: 0.029, fixed: 0.30 },
    AUD: { percent: 0.0175, fixed: 0.30 }
};

const normalizeFeeConfig = (config: StripeFeeConfig): StripeFeeConfig => {
    const percent = Number(config.percent);
    const fixed = Number(config.fixed);
    return {
        percent: Number.isFinite(percent) ? percent : 0,
        fixed: Number.isFinite(fixed) ? fixed : 0
    };
};

export const getStripeFeeConfig = (currency: string): StripeFeeConfig => {
    const key = currency.toUpperCase();
    if (STRIPE_FEE_CONFIG[key]) {
        return normalizeFeeConfig(STRIPE_FEE_CONFIG[key]);
    }
    return normalizeFeeConfig(DEFAULT_STRIPE_FEE);
};

export const calculateStripeProcessingFee = (baseAmount: number, currency: string): number => {
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
        return 0;
    }

    const { percent, fixed } = getStripeFeeConfig(currency);
    if (percent <= 0 && fixed <= 0) {
        return 0;
    }

    const baseSmallestUnit = toSmallestUnit(baseAmount, currency);
    const fixedSmallestUnit = toSmallestUnit(fixed, currency);
    const denominator = 1 - percent;
    if (denominator <= 0) {
        return 0;
    }

    const feeSmallestUnit = Math.ceil(
        (baseSmallestUnit * percent + fixedSmallestUnit) / denominator
    );
    return Math.max(0, fromSmallestUnit(feeSmallestUnit, currency));
};
