import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureGoogleTagDestination } from './google-tag';

describe('configureGoogleTagDestination', () => {
    let appendChildMock: ReturnType<typeof vi.fn>;
    let createElementMock: ReturnType<typeof vi.fn>;
    let gtagMock: ReturnType<typeof vi.fn>;
    let script: {
        async?: boolean;
        dataset: Record<string, string>;
        src?: string;
    };

    beforeEach(() => {
        gtagMock = vi.fn();
        appendChildMock = vi.fn();
        script = { dataset: {} };
        createElementMock = vi.fn(() => script);

        vi.stubGlobal('window', {
            dataLayer: [],
            gtag: gtagMock,
        });
        vi.stubGlobal('document', {
            querySelector: vi.fn(() => null),
            createElement: createElementMock,
            head: { appendChild: appendChildMock },
        });
    });

    it('loads gtag.js with the destination ID and configures it before events are sent', () => {
        configureGoogleTagDestination('G-ABC123');

        expect(createElementMock).toHaveBeenCalledWith('script');
        expect(script).toMatchObject({
            async: true,
            dataset: { htGoogleTag: 'true' },
            src: 'https://www.googletagmanager.com/gtag/js?id=G-ABC123',
        });
        expect(appendChildMock).toHaveBeenCalledWith(script);
        expect(gtagMock.mock.calls[0]?.[0]).toBe('consent');
        expect(gtagMock.mock.calls[1]?.[0]).toBe('js');
        expect(gtagMock).toHaveBeenNthCalledWith(3, 'config', 'G-ABC123', {
            send_page_view: false,
        });
    });

    it('registers a denied consent default exactly once, before the tag bootstraps', () => {
        configureGoogleTagDestination('G-ABC123');
        configureGoogleTagDestination('AW-123456789');

        const consentDefaultCalls = gtagMock.mock.calls.filter(
            (call) => call[0] === 'consent' && call[1] === 'default',
        );
        expect(consentDefaultCalls).toEqual([
            [
                'consent',
                'default',
                {
                    ad_storage: 'denied',
                    analytics_storage: 'denied',
                    ad_user_data: 'denied',
                    ad_personalization: 'denied',
                },
            ],
        ]);
        expect(gtagMock.mock.calls[0]).toEqual(consentDefaultCalls[0]);
    });

    it('does not reload or reconfigure an existing destination', () => {
        vi.mocked(document.querySelector)
            .mockReturnValueOnce(null)
            .mockReturnValue(script as unknown as Element);

        configureGoogleTagDestination('AW-123456789');
        configureGoogleTagDestination('AW-123456789');

        expect(appendChildMock).toHaveBeenCalledTimes(1);
        expect(gtagMock.mock.calls.filter((call) => call[0] === 'config')).toEqual([
            ['config', 'AW-123456789', { send_page_view: false }],
        ]);
    });
});
