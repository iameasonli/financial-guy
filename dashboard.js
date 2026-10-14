/**
 * 金融看板 - 世界地图交易所开盘状态
 * 根据用户本地时间实时显示各国家交易所是否开盘
 */

(function () {
    'use strict';

    /**
     * 主要交易所配置：时区、交易时间（本地时间）、坐标、国家代码
     * 交易时间格式：{ start: "HH:mm", end: "HH:mm" }
     * 部分交易所有午休，此处简化为核心交易时段
     */
    const EXCHANGES = [
        { id: 'NYSE', name: 'NYSE/NASDAQ', country: 'US', tz: 'America/New_York', lat: 40.71, lng: -74.01, hours: { start: '09:30', end: '16:00' } },
        { id: 'TSX', name: 'Toronto Stock Exchange', country: 'CA', tz: 'America/Toronto', lat: 43.65, lng: -79.38, hours: { start: '09:30', end: '16:00' } },
        { id: 'LSE', name: 'London Stock Exchange', country: 'GB', tz: 'Europe/London', lat: 51.51, lng: -0.09, hours: { start: '08:00', end: '16:30' } },
        { id: 'XETRA', name: 'Frankfurt Stock Exchange', country: 'DE', tz: 'Europe/Berlin', lat: 50.11, lng: 8.68, hours: { start: '09:00', end: '17:30' } },
        { id: 'EPA', name: 'Euronext Paris', country: 'FR', tz: 'Europe/Paris', lat: 48.87, lng: 2.34, hours: { start: '09:00', end: '17:30' } },
        { id: 'TSE', name: 'Tokyo Stock Exchange', country: 'JP', tz: 'Asia/Tokyo', lat: 35.68, lng: 139.77, hours: { start: '09:00', end: '15:00' } },
        { id: 'HKEX', name: 'Hong Kong Exchange', country: 'HK', tz: 'Asia/Hong_Kong', lat: 22.28, lng: 114.16, hours: { start: '09:30', end: '16:00' } },
        { id: 'SSE', name: 'Shanghai Stock Exchange', country: 'CN', tz: 'Asia/Shanghai', lat: 31.23, lng: 121.47, hours: { start: '09:30', end: '15:00' } },
        { id: 'SGX', name: 'Singapore Exchange', country: 'SG', tz: 'Asia/Singapore', lat: 1.28, lng: 103.85, hours: { start: '09:00', end: '17:00' } },
        { id: 'KRX', name: 'Korea Exchange', country: 'KR', tz: 'Asia/Seoul', lat: 37.57, lng: 126.98, hours: { start: '09:00', end: '15:30' } },
        { id: 'NSE', name: 'National Stock Exchange India', country: 'IN', tz: 'Asia/Kolkata', lat: 19.06, lng: 72.88, hours: { start: '09:15', end: '15:30' } },
        { id: 'ASX', name: 'Australian Securities Exchange', country: 'AU', tz: 'Australia/Sydney', lat: -33.87, lng: 151.21, hours: { start: '10:00', end: '16:00' } },
        { id: 'NZX', name: 'New Zealand Exchange', country: 'NZ', tz: 'Pacific/Auckland', lat: -36.85, lng: 174.76, hours: { start: '10:00', end: '16:45' } },
        { id: 'B3', name: 'B3 Brazil Exchange', country: 'BR', tz: 'America/Sao_Paulo', lat: -23.55, lng: -46.63, hours: { start: '10:00', end: '17:00' } }
    ];

    /** 状态：开盘 / 收盘 / 周末 */
    const STATUS = { OPEN: 'open', CLOSED: 'closed', WEEKEND: 'weekend' };

    /**
     * 解析 "HH:mm" 为分钟数（当日 0 点起）
     */
    function parseTime(str) {
        const [h, m] = str.split(':').map(Number);
        return h * 60 + m;
    }

    /**
     * 判断某时区下当前是否为周末（周六或周日）
     */
    function isWeekend(tz) {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
        const day = formatter.format(now);
        return day === 'Sat' || day === 'Sun';
    }

    /**
     * 获取某时区当前时间（分钟数，从 0:00 起）
     */
    function getMinutesInTimezone(tz) {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        const parts = formatter.formatToParts(now);
        const hour = parseInt(parts.find(p => p.type === 'hour').value, 10);
        const minute = parseInt(parts.find(p => p.type === 'minute').value, 10);
        return hour * 60 + minute;
    }

    /**
     * 计算交易所当前状态
     */
    function getExchangeStatus(ex) {
        if (isWeekend(ex.tz)) return STATUS.WEEKEND;

        const now = getMinutesInTimezone(ex.tz);
        const start = parseTime(ex.hours.start);
        const end = parseTime(ex.hours.end);

        if (now >= start && now <= end) return STATUS.OPEN;
        return STATUS.CLOSED;
    }

    /**
     * 获取状态对应的颜色和标签
     */
    function getStatusStyle(status) {
        switch (status) {
            case STATUS.OPEN:
                return { color: '#22c55e', label: 'Open' };
            case STATUS.CLOSED:
                return { color: '#ef4444', label: 'Closed' };
            case STATUS.WEEKEND:
                return { color: '#94a3b8', label: 'Weekend' };
            default:
                return { color: '#94a3b8', label: 'Unknown' };
        }
    }

    /**
     * 初始化 Leaflet 地图
     */
    function initMap() {
        const container = document.getElementById('exchange-map');
        if (!container) return;

        const L = window.L;
        if (!L) {
            container.innerHTML = '<p class="map-error">Map library failed to load. Please check your network.</p>';
            return;
        }

        let map;
        try {
            map = L.map(container, {
                center: [20, 0],
                zoom: 2,
                zoomControl: false
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }).addTo(map);

            L.control.zoom({ position: 'topright' }).addTo(map);
        } catch (error) {
            console.error('[Exchange map] Initialization failed.', error);
            container.innerHTML = '<p class="map-error">Interactive map is unavailable. Exchange statuses are still shown below.</p>';
            return null;
        }

        const markers = [];
        const updateMarkers = () => {
            markers.forEach(m => m.remove());
            markers.length = 0;

            EXCHANGES.forEach(ex => {
                const status = getExchangeStatus(ex);
                const style = getStatusStyle(status);
                const localTime = new Date().toLocaleTimeString('en-US', { timeZone: ex.tz, hour: '2-digit', minute: '2-digit' });

                const marker = L.circleMarker([ex.lat, ex.lng], {
                    radius: 10,
                    fillColor: style.color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.9
                }).addTo(map);

                marker.bindPopup(`
                    <strong>${ex.name}</strong><br>
                    Status: ${style.label}<br>
                    Local: ${localTime}
                `);

                markers.push(marker);
            });
        };

        updateMarkers();
        setInterval(updateMarkers, 60000); // 每分钟刷新
        requestAnimationFrame(() => map.invalidateSize());

        return map;
    }

    /**
     * 渲染交易所状态列表
     */
    function renderExchangeList() {
        const listEl = document.getElementById('exchange-list');
        if (!listEl) return;

        const now = new Date();
        const userTime = now.toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'medium'
        });

        listEl.innerHTML = `
            <div class="exchange-list-header">
                <span>Your local time: ${userTime}</span>
                <span class="exchange-legend">
                    <span class="legend-dot open"></span>Open
                    <span class="legend-dot closed"></span>Closed
                    <span class="legend-dot weekend"></span>Weekend
                </span>
            </div>
            <ul class="exchange-items">
                ${EXCHANGES.map(ex => {
                    const status = getExchangeStatus(ex);
                    const style = getStatusStyle(status);
                    const localTime = now.toLocaleTimeString('en-US', { timeZone: ex.tz, hour: '2-digit', minute: '2-digit' });
                    return `
                        <li class="exchange-item ${status}">
                            <span class="exchange-dot" style="background:${style.color}"></span>
                            <span class="exchange-name">${ex.name}</span>
                            <span class="exchange-time">${localTime}</span>
                            <span class="exchange-status">${style.label}</span>
                        </li>
                    `;
                }).join('')}
            </ul>
        `;
    }

    /**
     * 定时更新列表
     */
    function startListUpdater() {
        renderExchangeList();
        setInterval(renderExchangeList, 60000);
    }

    /**
     * 页面加载完成后初始化
     */
    function init() {
        const initialize = () => {
            startListUpdater();
            initMap();
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialize);
        } else {
            initialize();
        }
    }

    init();
})();
