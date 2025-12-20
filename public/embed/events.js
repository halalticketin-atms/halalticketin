/**
 * Halal Ticketin' - Embeddable Events Widget
 * 
 * Usage:
 * <div id="halal-ticketin-events" 
 *      data-organizer-id="optional-uuid" 
 *      data-limit="6"
 *      data-theme="light">
 * </div>
 * <script src="https://yoursite.com/embed/events.js"></script>
 */
(function () {
    'use strict';

    // Configuration
    const API_BASE = window.HALAL_TICKETIN_API_URL || 'http://localhost:5174';
    const SITE_BASE = window.HALAL_TICKETIN_SITE_URL || 'http://localhost:3000';
    const CONTAINER_ID = 'halal-ticketin-events';

    // Styles
    const STYLES = `
        .ht-embed-container {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
        }
        .ht-embed-container * {
            box-sizing: border-box;
        }
        .ht-embed-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
        }
        .ht-embed-card {
            border-radius: 12px;
            overflow: hidden;
            transition: transform 0.2s, box-shadow 0.2s;
            text-decoration: none;
            display: block;
        }
        .ht-embed-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
        }
        .ht-embed-card-image {
            width: 100%;
            aspect-ratio: 4 / 5;
            object-fit: cover;
            background: linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%);
        }
        .ht-embed-card-image-placeholder {
            width: 100%;
            aspect-ratio: 4 / 5;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
        }
        .ht-embed-card-content {
            padding: 1rem;
        }
        .ht-embed-card-title {
            font-size: 1.125rem;
            font-weight: 600;
            margin: 0 0 0.5rem 0;
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .ht-embed-card-meta {
            font-size: 0.875rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
        }
        .ht-embed-card-meta svg {
            width: 16px;
            height: 16px;
            flex-shrink: 0;
        }
        .ht-embed-card-organizer {
            font-size: 0.75rem;
            margin-top: 0.75rem;
        }
        .ht-embed-loading {
            text-align: center;
            padding: 2rem;
        }
        .ht-embed-error {
            text-align: center;
            padding: 2rem;
            color: #dc2626;
        }
        .ht-embed-empty {
            text-align: center;
            padding: 3rem 1rem;
            border-radius: 12px;
        }
        .ht-embed-powered {
            text-align: center;
            font-size: 0.75rem;
            margin-top: 1.5rem;
            opacity: 0.7;
        }
        .ht-embed-powered a {
            text-decoration: none;
            font-weight: 500;
        }

        /* Light theme (default) */
        .ht-embed-container.ht-theme-light {
            color: #1f2937;
        }
        .ht-theme-light .ht-embed-card {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .ht-theme-light .ht-embed-card-image-placeholder {
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
            color: #9ca3af;
        }
        .ht-theme-light .ht-embed-card-meta {
            color: #6b7280;
        }
        .ht-theme-light .ht-embed-card-organizer {
            color: #9ca3af;
        }
        .ht-theme-light .ht-embed-empty {
            background: #f9fafb;
            color: #6b7280;
        }
        .ht-theme-light .ht-embed-powered a {
            color: #3b82f6;
        }

        /* Dark theme */
        .ht-embed-container.ht-theme-dark {
            color: #f9fafb;
        }
        .ht-theme-dark .ht-embed-card {
            background: #1f2937;
            border: 1px solid #374151;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        .ht-theme-dark .ht-embed-card-image-placeholder {
            background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
            color: #6b7280;
        }
        .ht-theme-dark .ht-embed-card-meta {
            color: #9ca3af;
        }
        .ht-theme-dark .ht-embed-card-organizer {
            color: #6b7280;
        }
        .ht-theme-dark .ht-embed-empty {
            background: #111827;
            color: #9ca3af;
        }
        .ht-theme-dark .ht-embed-powered a {
            color: #60a5fa;
        }
    `;

    // Icons (inline SVG)
    const ICONS = {
        calendar: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
        mapPin: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
        globe: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
    };

    /**
     * Format date for display
     */
    function formatDate(dateString) {
        if (!dateString) return 'Date TBD';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    /**
     * Get location display string
     */
    function getLocation(event) {
        if (event.locationType === 'online') {
            return { text: 'Online Event', icon: ICONS.globe };
        }
        const parts = [event.venue, event.city].filter(Boolean);
        return {
            text: parts.length > 0 ? parts.join(', ') : 'Location TBD',
            icon: ICONS.mapPin
        };
    }

    /**
     * Create event card HTML
     */
    function createEventCard(event, siteBase) {
        const date = formatDate(event.startDatetime);
        const location = getLocation(event);
        const eventUrl = `${siteBase}/events/${event.slug || event.id}`;

        const imageHtml = event.bannerImageUrl
            ? `<img class="ht-embed-card-image" src="${event.bannerImageUrl}" alt="${event.title || 'Event'}" loading="lazy">`
            : `<div class="ht-embed-card-image-placeholder">📅</div>`;

        return `
            <a href="${eventUrl}" target="_blank" rel="noopener" class="ht-embed-card">
                ${imageHtml}
                <div class="ht-embed-card-content">
                    <h3 class="ht-embed-card-title">${event.title || 'Untitled Event'}</h3>
                    <div class="ht-embed-card-meta">
                        ${ICONS.calendar}
                        <span>${date}</span>
                    </div>
                    <div class="ht-embed-card-meta">
                        ${location.icon}
                        <span>${location.text}</span>
                    </div>
                    ${event.organizerName ? `<div class="ht-embed-card-organizer">By ${event.organizerName}</div>` : ''}
                </div>
            </a>
        `;
    }

    /**
     * Fetch events from API
     */
    async function fetchEvents(apiBase, options) {
        const params = new URLSearchParams();
        if (options.organizerId) params.set('organizerId', options.organizerId);
        if (options.limit) params.set('limit', String(options.limit));

        const url = `${apiBase}/api/v1/public/events${params.toString() ? '?' + params.toString() : ''}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch events: ${response.status}`);
        }

        const data = await response.json();
        return data.events || [];
    }

    /**
     * Render the widget
     */
    async function render() {
        const container = document.getElementById(CONTAINER_ID);
        if (!container) {
            console.warn(`Halal Ticketin: Container #${CONTAINER_ID} not found`);
            return;
        }

        // Read options from data attributes
        const options = {
            organizerId: container.dataset.organizerId || null,
            limit: parseInt(container.dataset.limit, 10) || 6,
            theme: container.dataset.theme || 'light'
        };

        // Inject styles
        if (!document.getElementById('ht-embed-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'ht-embed-styles';
            styleEl.textContent = STYLES;
            document.head.appendChild(styleEl);
        }

        // Show loading state
        container.innerHTML = `
            <div class="ht-embed-container ht-theme-${options.theme}">
                <div class="ht-embed-loading">Loading events...</div>
            </div>
        `;

        try {
            const events = await fetchEvents(API_BASE, options);

            if (events.length === 0) {
                container.innerHTML = `
                    <div class="ht-embed-container ht-theme-${options.theme}">
                        <div class="ht-embed-empty">
                            <p>No upcoming events at the moment.</p>
                            <p>Check back soon!</p>
                        </div>
                        <div class="ht-embed-powered">
                            Powered by <a href="${SITE_BASE}" target="_blank" rel="noopener">Halal Ticketin'</a>
                        </div>
                    </div>
                `;
                return;
            }

            const cardsHtml = events.map(event => createEventCard(event, SITE_BASE)).join('');

            container.innerHTML = `
                <div class="ht-embed-container ht-theme-${options.theme}">
                    <div class="ht-embed-grid">
                        ${cardsHtml}
                    </div>
                    <div class="ht-embed-powered">
                        Powered by <a href="${SITE_BASE}" target="_blank" rel="noopener">Halal Ticketin'</a>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Halal Ticketin embed error:', error);
            container.innerHTML = `
                <div class="ht-embed-container ht-theme-${options.theme}">
                    <div class="ht-embed-error">
                        Unable to load events. Please try again later.
                    </div>
                </div>
            `;
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    } else {
        render();
    }

    // Expose refresh function for manual updates
    window.HalalTicketinEmbed = {
        refresh: render
    };
})();
