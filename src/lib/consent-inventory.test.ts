import { describe, expect, it } from 'vitest';
import {
    ANALYTICS_TECHNOLOGIES,
    BROWSER_STORAGE_ITEMS,
    MARKETING_TECHNOLOGIES,
} from './consent-inventory';

describe('consent inventory', () => {
    it('discloses every shipped organiser tracking provider', () => {
        expect(ANALYTICS_TECHNOLOGIES.map((technology) => technology.name)).toContain(
            'Google Analytics 4',
        );
        expect(MARKETING_TECHNOLOGIES.map((technology) => technology.name)).toEqual(
            expect.arrayContaining(['Meta Pixel', 'TikTok Pixel', 'Google Ads']),
        );
    });

    it('explains that the Google tag library can load for analytics or marketing', () => {
        const ga4 = ANALYTICS_TECHNOLOGIES.find(
            (technology) => technology.name === 'Google Analytics 4',
        );

        expect(ga4?.runsWhen).toContain('analytics or marketing storage');
        expect(ga4?.runsWhen).toContain('GA4 events only after analytics storage');
    });

    it('discloses the first-party data layer purchase dedupe key', () => {
        expect(BROWSER_STORAGE_ITEMS).toContainEqual(
            expect.objectContaining({
                key: 'ht_data_layer_purchase_tracked:{orderId}',
                storage: 'localStorage',
            }),
        );
    });
});
