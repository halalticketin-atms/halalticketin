export type ForegroundRefreshGuard = {
    requestVersion: number;
    currentRequestVersion: number;
    saveGenerationAtStart: number;
    currentSaveGeneration: number;
    saveInProgress: boolean;
};

/**
 * A foreground response is usable only while it remains the newest request and
 * no save has completed since it began.
 */
export const shouldApplyForegroundRefresh = ({
    requestVersion,
    currentRequestVersion,
    saveGenerationAtStart,
    currentSaveGeneration,
    saveInProgress,
}: ForegroundRefreshGuard) =>
    !saveInProgress
    && requestVersion === currentRequestVersion
    && saveGenerationAtStart === currentSaveGeneration;

export const isNewerServerTimestamp = (current: string | null, next: string | null) => {
    if (!next) return false;
    if (!current) return Number.isFinite(Date.parse(next));
    const currentTime = Date.parse(current);
    const nextTime = Date.parse(next);
    return Number.isFinite(currentTime) && Number.isFinite(nextTime) && nextTime > currentTime;
};
