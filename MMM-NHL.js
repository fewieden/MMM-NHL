/* Magic Mirror
 * Module: MMM-NHL
 *
 * By fewieden https://github.com/fewieden/MMM-NHL
 * MIT Licensed.
 */

/* global Module Log config */

Module.register('MMM-NHL', {
    modes: {
        PR: 'Pre-season',
        R: 'Regular season',
        P: 'Playoffs',
    },

    states: {
        '1st': '1ST_PERIOD',
        '2nd': '2ND_PERIOD',
        '3rd': '3RD_PERIOD',
        OT: 'OVER_TIME',
        SO: 'SHOOTOUT',
        FINAL: 'FINAL',
        'FINAL OT': 'FINAL_OVERTIME',
        'FINAL SO': 'FINAL_SHOOTOUT'
    },

    loading: true,
    games: [],
    season: {},
    rotateIndex: 0,
    rotateInterval: null,

    defaults: {
        colored: false,
        focus_on: false,
        matches: 6,
        rotateInterval: 20 * 1000, // every 20 seconds
        reloadInterval: 30 * 60 * 1000 // every 30 minutes
    },

    getTranslations() {
        return {
            en: 'translations/en.json',
            de: 'translations/de.json',
            fr: 'translations/fr.json'
        };
    },

    getStyles() {
        return ['font-awesome.css', 'MMM-NHL.css'];
    },

    getTemplate() {
        return 'templates/MMM-NHL.njk';
    },

    getTemplateData() {
        return {
            loading: this.loading,
            modes: this.modes,
            season: this.season,
            games: this.games,
            rotateIndex: this.rotateIndex,
            maxGames: Math.min(this.games.length, this.rotateIndex + this.config.matches)
        };
    },

    start() {
        Log.info(`Starting module: ${this.name}`);
        this.addFilters();
        this.sendSocketNotification('CONFIG', { config: this.config });
    },

    socketNotificationReceived(notification, payload) {
        if (notification === 'SCHEDULE') {
            this.loading = false;
            this.games = payload.games;
            this.season = payload.season;
            this.setRotateInterval();
        }
    },

    setRotateInterval() {
        if (!this.rotateInterval && this.games.length > this.config.matches) {
            this.rotateInterval = setInterval(() => {
                if (this.rotateIndex + this.config.matches >= this.games.length) {
                    this.rotateIndex = 0;
                } else {
                    this.rotateIndex = this.rotateIndex + this.config.matches;
                }
                this.updateDom(300);
            }, this.config.rotateInterval);
        } else if (this.games.length <= this.config.matches) {
            clearInterval(this.rotateInterval);
            this.rotateIndex = 0;
        }

        this.updateDom(300);
    },

    addFilters() {
        this.nunjucksEnvironment().addFilter('calendar', (game) => {
            if (game.status.detailed === 'Pre-Game') {
                return this.translate('PRE_GAME');
            } else if (game.status.abstract === 'Preview') {
                const now = new Date();
                const inAWeek = now.setDate(now.getDate() + 7);
                const start = new Date(game.timestamp);

                if (start > inAWeek) {
                    return new Intl.DateTimeFormat(config.locale, {
                        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                    }).format(start);
                }

                return new Intl.DateTimeFormat(config.locale, {
                    weekday: 'short', hour: '2-digit', minute: '2-digit'
                }).format(start);
            } else if (game.status.abstract === 'Live' && game.live.period) {
                return `${game.live.period} ${game.live.timeRemaining}`;
            }

            return this.translate(game.status.abstract);
        });
    }
});
