/**
 * Halal Ticketin' - Embeddable Checkout Widget
 *
 * Usage:
 * <div id="halal-ticketin-checkout"
 *      data-event-slug="prayer-event"
 *      data-theme="light"
 *      data-height="800px">
 * </div>
 * <script src="https://yoursite.com/embed/checkout.js"></script>
 */
(function () {
    'use strict';

    const SITE_BASE = window.HALAL_TICKETIN_SITE_URL || 'http://localhost:3000';
    const CONTAINER_SELECTOR = '#halal-ticketin-checkout';

    function buildIframeSrc(slug, theme, previewEnabled) {
        const base = SITE_BASE.replace(/\/$/, '');
        const safeTheme = theme === 'dark' ? 'dark' : 'light';
        const params = new URLSearchParams({ theme: safeTheme });
        if (previewEnabled) {
            params.set('preview', '1');
        }
        return `${base}/embed/checkout/${slug}?${params.toString()}`;
    }

    function showError(container, message) {
        container.innerHTML = `<div style="font-family: Arial, sans-serif; padding: 12px; color: #b91c1c;">${message}</div>`;
    }

    function createIframe(container) {
        const slug = container.dataset.eventSlug;
        if (!slug) {
            showError(container, 'Halal Ticketin: Missing data-event-slug.');
            return;
        }

        const theme = container.dataset.theme || 'light';
        const height = container.dataset.height || '800px';
        const previewValue = container.dataset.preview;
        const previewEnabled = previewValue
            ? previewValue === 'true' || previewValue === '1'
            : true;
        const frame = document.createElement('iframe');
        frame.src = buildIframeSrc(slug, theme, previewEnabled);
        frame.title = 'Halal Ticketin Checkout';
        frame.style.width = '100%';
        frame.style.border = '0';
        frame.style.height = height;
        frame.setAttribute('loading', 'lazy');
        frame.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');

        container.appendChild(frame);

        window.addEventListener('message', (event) => {
            if (!event.data || event.data.source !== 'ht-embed' || event.data.type !== 'resize') {
                return;
            }
            if (typeof event.data.height === 'number') {
                frame.style.height = `${event.data.height}px`;
            }
        });
    }

    function init() {
        const container = document.querySelector(CONTAINER_SELECTOR);
        if (!container) {
            return;
        }
        createIframe(container);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
