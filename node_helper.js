/**
 * @file node_helper.js
 *
 * @author fewieden
 * @license MIT
 *
 * @see  https://github.com/fewieden/MMM-NHL
 */

/* eslint-env node */

/**
 * @external node-fetch
 * @see https://www.npmjs.com/package/node-fetch
 */
const fetch = require('node-fetch');

/**
 * @external node_helper
 * @see https://github.com/MichMich/MagicMirror/blob/master/js/node_helper.js
 */
const NodeHelper = require('node_helper');

const GameProvider = require('./providers/gameprovider.js');

const BASE_URL = 'https://statsapi.web.nhl.com/api/v1';

/**
 * Derived team details of a game from API endpoint for easier usage.
 *
 * @typedef {object} Team
 * @property {number} id - Team identifier.
 * @property {string} name - Full team name.
 * @property {string} short - 3 letter team name.
 * @property {number} score - Current score of the team.
 */

/**
 * Derived game details from API endpoint for easier usage.
 *
 * @typedef {object} Game
 * @property {number} id - Game identifier.
 * @property {string} timestamp - Start date of the game in UTC timezone.
 * @property {object} status - Contains information about the game status.
 * @property {string} status.abstract - Abstract game status e.g. Preview, Live or Final.
 * @property {string} status.detailed - More detailed version of the abstract game status.
 * @property {object} teams - Contains information about both teams.
 * @property {Team} teams.away - Contains information about the away team.
 * @property {Team} teams.home - Contains information about the home team.
 * @property {object} live - Contains information about the live state of the game.
 * @property {string} live.period - Period of the game e.g. 1st, 2nd, 3rd, OT or SO.
 * @property {string} live.timeRemaining - Remaining time of the current period in format mm:ss.
 */

/**
 * Derived season details from API endpoint for easier usage.
 *
 * @typedef {object} SeasonDetails
 * @property {string} year - Year of the season in format yy/yy e.g. 20/21.
 * @property {string} mode - Mode of the season e.g. PR, R and P.
 */

/**
 * @module node_helper
 * @description Backend for the module to query data from the API provider.
 *
 * @requires external:node-fetch
 * @requires external:querystring
 * @requires external:node_helper
 */
module.exports = NodeHelper.create({
    /** @member {?Game} nextGame - The next upcoming game is stored in this variable. */
    nextGame: null,
    /** @member {Game[]} liveGames - List of all ongoing games. */
    liveGames: [],
    provider: null,
    teams: [],

    /**
     * @function socketNotificationReceived
     * @description Receives socket notifications from the module.
     * @async
     * @override
     *
     * @param {string} notification - Notification name
     * @param {*} payload - Detailed payload of the notification.
     *
     * @returns {void}
     */
    async socketNotificationReceived(notification, payload) {
        if (notification === 'CONFIG') {
            this.config = payload.config;
            require(`./providers/${this.config.provider.toLowerCase()}.js`);
            this.teams = await this.initTeams();
            this.provider = GameProvider.initialize(this.config.provider, this.config, this.teams);
            await this.updateSchedule();
            setInterval(() => this.updateSchedule(), this.config.reloadInterval);
            setInterval(() => this.fetchOnLiveState(), this.config.liveReloadInterval);
        }
    },

    /**
     * @function initTeams
     * @description Retrieves a list of all teams from the API and initializes teamMapping.
     * @async
     *
     * @returns {void}
     */
    async initTeams() {
        const response = await fetch(`${BASE_URL}/teams`);

        if (!response.ok) {
            console.error(`Initializing NHL teams failed: ${response.status} ${response.statusText}`);

            return;
        }

        const {teams} = await response.json();

        this.teamMapping = teams.reduce((mapping, team) => {
            mapping[team.id] = team.abbreviation;

            return mapping;
        }, {});

        return teams;
    },

    /**
     * @function filterGameByFocus
     * @description Helper function to filter games based on config option.
     *
     * @param {object} game - Raw game information.
     *
     * @returns {boolean} Should game remain in list?
     */
    filterGameByFocus(game) {
        const focus = this.config.focus_on;
        if (!focus) {
            return true;
        }

        const homeTeam = this.teamMapping[game.teams.home.team.id];
        const awayTeam = this.teamMapping[game.teams.away.team.id];

        return focus.includes(homeTeam) || focus.includes(awayTeam);
    },

    /**
     * @function computeSeasonDetails
     * @description Computes current season details (year and mode) from list of games.
     *
     * @param {object[]} schedule - List of raw games from API endpoint.
     *
     * @returns {SeasonDetails} Current season details.
     */
    computeSeasonDetails(schedule) {
        const game = schedule.find(game => game.status.abstractGameState !== 'Final') || schedule[schedule.length - 1];

        if (game) {
            return {
                year: `${game.season.slice(2, 4)}/${game.season.slice(6, 8)}`,
                mode: game.gameType
            };
        }

        const year = new Date().getFullYear();
        const currentYear = year.toString().slice(-2);
        const nextYear = (year + 1).toString().slice(-2);

        return {
            year: `${currentYear}/${nextYear}`,
            mode: 'PR'
        };
    },

    /**
     * @function setNextandLiveGames
     * @description Sets the next scheduled and live games from a list of games.
     *
     * @param {Game[]} games - List of games.
     *
     * @returns {void}
     */
    setNextandLiveGames(games) {
        this.nextGame = games.find(game => game.status.abstract === 'Preview');
        this.liveGames = games.filter(game => game.status.abstract === 'Live');
    },

    /**
     * @function sortGamesByTimestampAndID
     * @description Helper function to sort games by timestamp and ID.
     *
     * @param {object} game1 - Raw game information of first game.
     * @param {object} game2 - Raw game information of second game.
     *
     * @returns {number} Should game be before or after in the list?
     */
    sortGamesByTimestampAndID(game1, game2) {
        if (game1.gameDate === game2.gameDate) {
            return game1.id > game2.id ? 1 : -1;
        }

        return game1.gameDate > game2.gameDate ? 1 : -1;
    },

    /**
     * @function updateSchedule
     * @description Retrieves new schedule from API and sends a socket notification to the module.
     * @async
     *
     * @returns {void}
     */
    async updateSchedule() {
        const schedule = await this.provider.fetch();
        schedule.sort(this.sortGamesByTimestampAndID);
        const season = await this.provider.fetchSeason(schedule);

        const focusSchedule = schedule.filter(this.filterGameByFocus.bind(this));

        this.setNextandLiveGames(focusSchedule);
        this.sendSocketNotification('SCHEDULE', {games: schedule, season});
    },

    /**
     * @function fetchOnLiveState
     * @description If there is a live game trigger updateSchedule.
     * @async
     *
     * @returns {void}
     */
    fetchOnLiveState() {
        const hasLiveGames = this.liveGames.length > 0;
        const gameAboutToStart = this.nextGame && new Date() > new Date(this.nextGame.gameDate);

        if (hasLiveGames || gameAboutToStart) {
            return this.updateSchedule();
        }
    }
});
