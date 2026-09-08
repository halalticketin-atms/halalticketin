/**
 * Halal Ticketin' embeddable checkout widget.
 *
 * Usage:
 * <div data-halal-ticketin-checkout data-event-slug="prayer-event" data-theme="light"></div>
 * <script src="https://www.halalticketin.com/embed/checkout.js"></script>
 */
(function () {
    'use strict';

    const REGISTRY_KEY = '__halalTicketinCheckoutEmbed';
    const existingEmbed = window[REGISTRY_KEY];
    if (existingEmbed && typeof existingEmbed.init === 'function') {
        existingEmbed.init();
        return;
    }

    const loaderSrc = document.currentScript && document.currentScript.src;
    const configuredBase = window.HALAL_TICKETIN_SITE_URL;
    let siteUrl;
    try {
        siteUrl = new URL(configuredBase || loaderSrc || 'https://www.halalticketin.com');
    } catch {
        siteUrl = new URL('https://www.halalticketin.com');
    }

    const SITE_BASE = siteUrl.origin;
    const CONTAINER_SELECTOR = '[data-halal-ticketin-checkout], #halal-ticketin-checkout';
    const FRAME_SELECTOR = 'iframe[data-halal-ticketin-checkout-frame="true"]';
    const MIN_HEIGHT = 160;
    const MAX_HEIGHT = 5000;
    const frames = new Set();

    function normalizeHexColour(value) {
        if (typeof value !== 'string') return null;
        const trimmed = value.trim();
        const shortMatch = /^#([0-9a-f]{3})$/i.exec(trimmed);
        if (shortMatch) {
            return `#${shortMatch[1]
                .split('')
                .map((character) => character.repeat(2))
                .join('')}`.toLowerCase();
        }
        return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed.toLowerCase() : null;
    }

    function parseBoolean(value) {
        if (value === 'true' || value === '1') return 'true';
        if (value === 'false' || value === '0') return 'false';
        return null;
    }

    function parseRadius(value) {
        if (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value.trim())) return null;
        const radius = Number(value);
        if (!Number.isFinite(radius)) return null;
        return String(Math.min(24, Math.max(0, Math.round(radius))));
    }

    function parseInitialHeight(value) {
        if (typeof value !== 'string') return MIN_HEIGHT;
        const match = /^(\d+(?:\.\d+)?)px$/i.exec(value.trim());
        if (!match) return MIN_HEIGHT;
        const height = Number(match[1]);
        if (!Number.isFinite(height)) return MIN_HEIGHT;
        return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(height)));
    }

    function isCollapsed(frame) {
        return frame.getClientRects().length === 0;
    }

    function requestHeight(frame) {
        frame.contentWindow?.postMessage({ source: 'ht-embed-host', type: 'measure' }, SITE_BASE);
    }

    function watchVisibility(container, frame) {
        if (typeof ResizeObserver === 'undefined') return;

        let wasCollapsed = isCollapsed(frame);
        const observer = new ResizeObserver(() => {
            const collapsed = isCollapsed(frame);
            if (wasCollapsed && !collapsed) requestHeight(frame);
            wasCollapsed = collapsed;
        });
        observer.observe(container);
    }

    function buildIframeSrc(container) {
        const slug = container.dataset.eventSlug;
        if (!slug) return null;

        const theme = container.dataset.theme === 'dark' ? 'dark' : 'light';
        const params = new URLSearchParams({ theme });
        const accent = normalizeHexColour(container.dataset.accent);
        const text = normalizeHexColour(container.dataset.text);
        const backgroundValue = container.dataset.background && container.dataset.background.trim().toLowerCase();
        const background = backgroundValue === 'transparent'
            ? 'transparent'
            : normalizeHexColour(container.dataset.background);
        const font = container.dataset.font === 'serif' ? 'serif' : null;
        const radius = parseRadius(container.dataset.radius);
        const minimal = parseBoolean(container.dataset.minimal);
        const showDetails = parseBoolean(container.dataset.showDetails);

        if (accent) params.set('accent', accent);
        if (background) params.set('background', background);
        if (text) params.set('text', text);
        if (font) params.set('font', font);
        if (radius) params.set('radius', radius);
        if (minimal) params.set('minimal', minimal);
        if (showDetails) params.set('showDetails', showDetails);

        return `${SITE_BASE}/embed/checkout/${encodeURIComponent(slug)}?${params.toString()}`;
    }

    function showError(container, message) {
        container.innerHTML = `<div style="font-family: Arial, sans-serif; padding: 12px; color: #b91c1c;">${message}</div>`;
    }

    function createIframe(container) {
        if (container.querySelector(FRAME_SELECTOR)) return;

        const src = buildIframeSrc(container);
        if (!src) {
            showError(container, 'Halal Ticketin: Missing data-event-slug.');
            return;
        }

        const frame = document.createElement('iframe');
        frame.src = src;
        frame.title = 'Halal Ticketin Checkout';
        frame.dataset.halalTicketinCheckoutFrame = 'true';
        frame.style.width = '100%';
        frame.style.border = '0';
        frame.style.height = `${parseInitialHeight(container.dataset.height)}px`;
        if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            frame.style.transition = 'height 180ms ease-out';
        }
        frame.setAttribute('loading', 'lazy');
        frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');

        container.appendChild(frame);
        frames.add(frame);
        watchVisibility(container, frame);
    }

    function init() {
        document.querySelectorAll(CONTAINER_SELECTOR).forEach(createIframe);
    }

    function handleResize(event) {
        if (event.origin !== siteUrl.origin || !event.data || event.data.source !== 'ht-embed' || event.data.type !== 'resize') {
            return;
        }

        const height = event.data.height;
        if (typeof height !== 'number' || !Number.isFinite(height) || height <= 0 || height > MAX_HEIGHT) {
            return;
        }

        for (const frame of frames) {
            if (frame.contentWindow === event.source) {
                if (isCollapsed(frame)) return;
                const nextHeight = `${Math.max(MIN_HEIGHT, Math.round(height))}px`;
                if (frame.style.height !== nextHeight) frame.style.height = nextHeight;
                return;
            }
        }
    }

    window.addEventListener('message', handleResize);
    const api = { init };
    window[REGISTRY_KEY] = api;
    window.HalalTicketinCheckout = api;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
