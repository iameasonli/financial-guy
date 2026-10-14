/**
 * Aggregate public financial RSS feeds in the browser via the free rss2json API.
 */
(function () {
    'use strict';

    const RSS2JSON_URL = 'https://api.rss2json.com/v1/api.json';
    const FEEDS = [
        { name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html' },
        { name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
        { name: 'The Guardian', url: 'https://www.theguardian.com/business/rss' },
        { name: 'The New York Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml' },
        { name: 'WSJ Markets', url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml' }
    ];
    const ITEM_COUNT = 8;
    const DISPLAY_COUNT = 20;
    const FETCH_TIMEOUT = 8000;
    const REFRESH_INTERVAL = 15 * 60 * 1000;
    const CACHE_KEY = 'financial-guy-news-v1';
    const CACHE_MAX_AGE = 5 * 60 * 1000;
    let isLoading = false;

    function fetchWithTimeout(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
        return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeoutId));
    }

    function safeHttpsUrl(value) {
        try {
            const url = new URL(value);
            return url.protocol === 'https:' ? url.href : '';
        } catch (_) {
            return '';
        }
    }

    function normalizeItems(items, source) {
        if (!Array.isArray(items)) return [];
        return items.slice(0, ITEM_COUNT).map(item => ({
            title: typeof item.title === 'string' ? item.title.trim() : '',
            link: safeHttpsUrl(item.link),
            pubDate: typeof item.pubDate === 'string' ? item.pubDate : '',
            source: source.name
        })).filter(item => item.title && item.link);
    }

    async function fetchSource(source) {
        const url = new URL(RSS2JSON_URL);
        url.searchParams.set('rss_url', source.url);

        const response = await fetchWithTimeout(url.href);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (!data || data.status !== 'ok') {
            throw new Error(data && data.message ? data.message : 'Invalid RSS response');
        }

        const items = normalizeItems(data.items, source);
        if (items.length === 0) throw new Error('No usable articles in feed');
        return items;
    }

    async function fetchNews() {
        const results = await Promise.all(FEEDS.map(async source => {
            try {
                return { source: source.name, items: await fetchSource(source) };
            } catch (error) {
                console.error(`[Financial news: ${source.name}]`, error);
                return { source: source.name, items: [] };
            }
        }));

        const items = results.flatMap(result => result.items);
        const uniqueItems = [...new Map(items.map(item => [
            item.title.toLowerCase(),
            item
        ])).values()];
        uniqueItems.sort((a, b) => {
            const dateA = Date.parse(a.pubDate) || 0;
            const dateB = Date.parse(b.pubDate) || 0;
            return dateB - dateA;
        });

        return {
            items: uniqueItems.slice(0, DISPLAY_COUNT),
            failedSources: results.filter(result => result.items.length === 0).map(result => result.source),
            fetchedAt: Date.now()
        };
    }

    function escapeHtml(value) {
        const element = document.createElement('span');
        element.textContent = value;
        return element.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        if (!dateString || Number.isNaN(date.getTime())) return '';

        const elapsedMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
        if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
        if (elapsedMinutes < 1440) return `${Math.floor(elapsedMinutes / 60)}h ago`;
        if (elapsedMinutes < 10080) return `${Math.floor(elapsedMinutes / 1440)}d ago`;
        return date.toLocaleDateString();
    }

    function renderLoading(container) {
        container.innerHTML = '<div class="rss-loading" role="status">Loading financial news...</div>';
    }

    function renderError(container) {
        container.innerHTML = `
            <div class="rss-error" role="status">
                <p>News feeds are temporarily unavailable. Please try again.</p>
                <button class="rss-refresh" type="button">Retry</button>
            </div>
        `;
    }

    function renderFeed(container, data) {
        if (!data.items.length) {
            renderError(container);
            return;
        }

        const failureNotice = data.failedSources.length
            ? `<p class="rss-notice">Some sources are unavailable: ${escapeHtml(data.failedSources.join(', '))}.</p>`
            : '';
        const html = `
            <div class="rss-feed">
                <div class="rss-header">
                    <h3 class="rss-title">Latest financial headlines</h3>
                    <button class="rss-refresh" type="button" aria-label="Refresh financial news">Refresh</button>
                </div>
                ${failureNotice}
                <ul class="rss-list">
                    ${data.items.map(item => `
                        <li class="rss-item">
                            <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="rss-item-link">
                                <span class="rss-item-copy">
                                    <span class="rss-item-title">${escapeHtml(item.title)}</span>
                                    <span class="rss-item-source">${escapeHtml(item.source)}</span>
                                </span>
                                <span class="rss-item-date">${escapeHtml(formatDate(item.pubDate))}</span>
                            </a>
                        </li>
                    `).join('')}
                </ul>
                <p class="rss-attribution">Headlines from CNBC, BBC, The Guardian, The New York Times, and The Wall Street Journal.</p>
            </div>
        `;
        container.innerHTML = html;
    }

    function readCache() {
        try {
            const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
            if (cached && Date.now() - cached.fetchedAt < CACHE_MAX_AGE && Array.isArray(cached.items)) {
                return cached;
            }
        } catch (error) {
            console.warn('[Financial news] Could not read cached headlines.', error);
        }
        return null;
    }

    function saveCache(data) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch (error) {
            console.warn('[Financial news] Could not cache headlines.', error);
        }
    }

    async function loadFeed(container, forceRefresh) {
        if (isLoading) return;

        if (!forceRefresh) {
            const cached = readCache();
            if (cached) {
                renderFeed(container, cached);
                return;
            }
        }

        isLoading = true;
        renderLoading(container);
        try {
            const data = await fetchNews();
            if (!data.items.length) {
                renderError(container);
                return;
            }
            saveCache(data);
            renderFeed(container, data);
        } catch (error) {
            console.error('[Financial news] Could not load headlines.', error);
            renderError(container);
        } finally {
            isLoading = false;
        }
    }

    function init() {
        const container = document.getElementById('benzinga-rss');
        if (!container) return;

        container.addEventListener('click', event => {
            if (event.target.closest('.rss-refresh')) loadFeed(container, true);
        });
        loadFeed(container, false);
        setInterval(() => loadFeed(container, true), REFRESH_INTERVAL);
    }

    init();
})();
