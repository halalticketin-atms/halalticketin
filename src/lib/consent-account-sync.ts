import type { ConsentPreferences } from './consent';

export interface AccountConsentRecord {
  analytics: boolean;
  marketing: boolean;
  version: number;
  updatedAt: string | null;
}

interface ConsentHydrationDependencies {
  load: () => Promise<AccountConsentRecord>;
  readLocal: () => ConsentPreferences | null;
  applyRemote: (preferences: ConsentPreferences) => void;
  write: (preferences: ConsentPreferences) => Promise<unknown>;
}

const parseTimestamp = (value?: string | null) => {
    if (!value) {
        return null;
    }

    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
};

const isLocalPreferenceNewer = (
    localPreferences: ConsentPreferences | null,
    accountRecord: AccountConsentRecord,
) => {
    const localUpdatedAt = parseTimestamp(localPreferences?.updatedAt);
    const accountUpdatedAt = parseTimestamp(accountRecord.updatedAt);
    return localUpdatedAt !== null && accountUpdatedAt !== null && localUpdatedAt > accountUpdatedAt;
};

export class ConsentAccountSync {
    private userId: string | null = null;
    private hydrationVersion = 0;
    private writeTails = new Map<string, Promise<void>>();

    setIdentity(userId: string | null) {
        if (this.userId === userId) {
            return;
        }

        this.userId = userId;
        this.hydrationVersion += 1;
    }

    cancelHydration(userId: string) {
        if (this.userId === userId) {
            this.hydrationVersion += 1;
        }
    }

    async hydrate(userId: string, dependencies: ConsentHydrationDependencies) {
        this.setIdentity(userId);
        const hydrationVersion = this.hydrationVersion;
        const isCurrent = () =>
            this.userId === userId && this.hydrationVersion === hydrationVersion;

        const response = await dependencies.load();
        if (!isCurrent()) {
            return;
        }

        const localPreferences = dependencies.readLocal();

        if (response.updatedAt !== null && response.version === 2) {
            if (isLocalPreferenceNewer(localPreferences, response)) {
                if (isCurrent() && localPreferences) {
                    await this.enqueueWrite(userId, localPreferences, dependencies.write);
                }
                return;
            }

            dependencies.applyRemote({
                analytics: response.analytics,
                marketing: response.marketing,
                updatedAt: response.updatedAt,
                version: 2,
            });
            return;
        }

        if (!localPreferences || !isCurrent()) {
            return;
        }

        await this.enqueueWrite(userId, localPreferences, dependencies.write);
    }

    persist(
        userId: string,
        preferences: ConsentPreferences,
        write: (preferences: ConsentPreferences) => Promise<unknown>,
    ) {
        this.setIdentity(userId);
        this.hydrationVersion += 1;
        return this.enqueueWrite(userId, preferences, write);
    }

    private enqueueWrite(
        userId: string,
        preferences: ConsentPreferences,
        write: (preferences: ConsentPreferences) => Promise<unknown>,
    ) {
        const previousWrite = this.writeTails.get(userId) ?? Promise.resolve();
        const result = previousWrite.then(async () => {
            if (this.userId !== userId) {
                return;
            }
            await write(preferences);
        });

        const settledResult = result.then(
            () => undefined,
            () => undefined,
        );
        this.writeTails.set(userId, settledResult);
        void settledResult.finally(() => {
            if (this.writeTails.get(userId) === settledResult) {
                this.writeTails.delete(userId);
            }
        });
        return result;
    }
}
