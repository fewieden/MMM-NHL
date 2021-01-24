/**
 * @file MMM-NHL.js
 *
 * @author fewieden
 * @license MIT
 *
 * @see  https://github.com/fewieden/MMM-NHL
 */

/**
 * @external Module
 * @see https://github.com/MichMich/MagicMirror/blob/master/js/module.js
 */

/**
 * @external Log
 * @see https://github.com/MichMich/MagicMirror/blob/master/js/logger.js
 */

/**
 * @module MMM-NHL
 * @description Frontend of the MagicMirror² module.
 *
 * @requires external:Module
 * @requires external:Log
 */
Module.register('MMM-NHL', {
    /**
     * @member {object.<string, string>} modes - Maps mode short codes to names.
     */
    modes: {
        PR: 'Pre-season',
        R: 'Regular season',
        P: 'Playoffs',
    },

    /**
     * @member {object.<string, string>} states - Maps game state short codes to translation keys.
     */
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

    /**
     * @member {boolean} loading - Indicates loading state of module and data.
     */
    loading: true,
    /**
     * @member {Game[]} games - List of all games matching focus and timespan config options.
     */
    games: [],
    /**
     * @member {SeasonDetails} season - Current season details e.g. year and mode.
     */
    season: {},
    /**
     * @member {number} rotateIndex - Current index of rotation carousel.
     */
    rotateIndex: 0,
    /**
     * @member {?Interval} rotateInterval - Interval to update rotation index.
     */
    rotateInterval: null,

    /**
     * @member {object} defaults - Defines the default config values.
     * @property {boolean} colored - Flag to show logos in color or black/white.
     * @property {boolean|string[]} focus_on - List of team name short codes to display games from.
     * @property {number} matches - Max amount of matches to display at once.
     * @property {number} rotateInterval - Amount of milliseconds a page of the carousel is displayed.
     * @property {number} reloadInterval - Amount of milliseconds between data fetching.
     * @property {number} liveReloadInterval - Amount of milliseconds between data fetching during a live game.
     * @property {number} daysInPast - Amount of days a match should be displayed after it is finished.
     * @property {number} daysAhead - Amount of days a match should be displayed before it starts.
     * @property {boolean} showNames - Flag to show team names.
     * @property {boolean} showLogos - Flag to show club logos.
     * @property {string} provider - Which game provider to use.
     */
    defaults: {
        colored: false,
        focus_on: false,
        matches: 6,
        rotateInterval: 20 * 1000,
        reloadInterval: 30 * 60 * 1000,
        liveReloadInterval: 60 * 1000,
        daysInPast: 1,
        daysAhead: 7,
        showNames: true,
        showLogos: true,
        provider: 'StandardNhl'
    },

    /**
     * @function getTranslations
     * @description Translations for this module.
     * @override
     *
     * @returns {object.<string, string>} Available translations for this module (key: language code, value: filepath).
     */
    getTranslations() {
        return {
            en: 'translations/en.json',
            de: 'translations/de.json',
            fr: 'translations/fr.json'
        };
    },

    /**
     * @function getStyles
     * @description Style dependencies for this module.
     * @override
     *
     * @returns {string[]} List of the style dependency filepaths.
     */
    getStyles() {
        return ['font-awesome.css', 'MMM-NHL.css'];
    },

    /**
     * @function getTemplate
     * @description Nunjuck template.
     * @override
     *
     * @returns {string} Path to nunjuck template.
     */
    getTemplate() {
        return 'templates/MMM-NHL.njk';
    },

    /**
     * @function getTemplateData
     * @description Data that gets rendered in the nunjuck template.
     * @override
     *
     * @returns {object} Data for the nunjuck template.
     */
    getTemplateData() {
        return {
            loading: this.loading,
            modes: this.modes,
            season: this.season,
            games: this.games,
            rotateIndex: this.rotateIndex,
            maxGames: Math.min(this.games.length, this.rotateIndex + this.config.matches),
            config: this.config
        };
    },

    /**
     * @function start
     * @description Adds nunjuck filters and sends config to node_helper.
     * @override
     *
     * @returns {void}
     */
    start() {
        Log.info(`Starting module: ${this.name}`);
        this.addFilters();
        this.sendSocketNotification('CONFIG', {config: this.config});
    },

    /**
     * @function socketNotificationReceived
     * @description Handles incoming messages from node_helper.
     * @override
     *
     * @param {string} notification - Notification name
     * @param {*} payload - Detailed payload of the notification.
     */
    socketNotificationReceived(notification, payload) {
        if (notification === 'SCHEDULE') {
            this.loading = false;
            this.games = payload.games;
            this.season = payload.season;
            this.setRotateInterval();
        }
    },

    /**
     * @function setRotateInterval
     * @description Sets interval if necessary which updates the rotateIndex.
     *
     * @returns {void}
     */
    setRotateInterval() {
        if (!this.rotateInterval && this.games.length > this.config.matches) {
            this.rotateInterval = setInterval(() => {
                if (this.rotateIndex + this.config.matches >= this.games.length) {
                    this.rotateIndex = 0;
                } else {
                    this.rotateIndex += this.config.matches;
                }
                this.updateDom(300);
            }, this.config.rotateInterval);
        } else if (this.games.length <= this.config.matches) {
            clearInterval(this.rotateInterval);
            this.rotateIndex = 0;
        }

        this.updateDom(300);
    },

    /**
     * @function addFilters
     * @description Adds the filter used by the nunjuck template.
     *
     * @returns {void}
     */
    addFilters() {
        this.nunjucksEnvironment().addFilter('formatStartDate', game => {
            const now = new Date();
            const inAWeek = now.setDate(now.getDate() + 7);
            const start = new Date(game.gameDate);

            if (start > inAWeek) {
                return new Intl.DateTimeFormat(this.config.locale, {
                    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                }).format(start);
            }

            return new Intl.DateTimeFormat(this.config.locale, {
                weekday: 'short', hour: '2-digit', minute: '2-digit'
            }).format(start);
        });
    }
});
