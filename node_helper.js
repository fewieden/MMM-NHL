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
 * @external logger
 * @see https://github.com/MichMich/MagicMirror/blob/master/js/logger.js
 */
const Log = require('logger');

/**
 * @external node_helper
 * @see https://github.com/MichMich/MagicMirror/blob/master/js/node_helper.js
 */
const NodeHelper = require('node_helper');

const BASE_PLAYOFF_URL = 'https://statsapi.web.nhl.com/api/v1/tournaments/playoffs?expand=round.series';

/**
 * Derived team details of a game from API endpoint for easier usage.
 *
 * @typedef {object} Team
 * @property {number} id - Team identifier.
 * @property {string} abbrev - 3 letter team name.
 * @property {number} score - Current score of the team.
 */

/**
 * Derived game details from API endpoint for easier usage.
 *
 * @typedef {object} Game
 * @property {number} id - Game identifier.
 * @property {string} timestamp - Start date of the game in UTC timezone.
 * @property {string} gameDay - Game day in format YYYY-MM-DD in north american timezone.
 * @property {string} gameState - Contains information about the game status, e.g. OFF, LIVE, CRIT, FUT.
 * @property {Team} away_team - Contains information about the away team.
 * @property {Team} home_team - Contains information about the home team.
 * @property {object} periodDescriptor - Contains information about the period of play of the game. Is present on all games, past, present, and future.
 * @property {number} periodDescriptor.number - Period of the game e.g. 1, 2, 3, 4.
 * @property {string} periodDescriptor.periodType - Abbreviated description of the period type, e.g. REG, OT.
 */

/**
 * Derived game details from API endpoint for easier usage.
 *
 * @typedef {object} Series
 * @property {number} gameNumberOfSeries - Game identifier.
 * @property {number} round - Playoff round number, e.g. 1, 2, 3, 4.
 * @property {string} roundAbbrev - Abbreviation of round type, e.g. SCF
 * @property {number} topSeedTeamId - Contains the ID of the top-seeded team.
 * @property {number} topSeedWins - Contains the number of wins of the top-seeded team in this round.
 * @property {number} bottomSeedTeamId - Contains the ID of the bottom-seeded team.
 * @property {number} bottomSeedWins - Contains the number of wins of the bottom-seed team in this round.
 */

/**
 * Derived season details from API endpoint for easier usage.
 *
 * @typedef {object} SeasonDetails
 * @property {string} year - Year of the season in format yy/yy e.g. 20/21.
 * @property {number} mode - Mode of the season e.g. 0, 1 and 2.
 */

/**
 * @module node_helper
 * @description Backend for the module to query data from the API provider.
 *
 * @requires external:node-fetch
 * @requires external:querystring
 * @requires external:logger
 * @requires external:node_helper
 */
module.exports = NodeHelper.create({
    /** @member {string} requiresVersion - Defines the minimum version of MagicMirror² to run this node_helper. */
    requiresVersion: '2.15.0',
    /** @member {?Game} nextGame - The next upcoming game is stored in this variable. */
    nextGame: null,
    /** @member {Game[]} liveGames - List of all ongoing games. */
    liveGames: [],

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

            await this.initTeams();

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
        const response = await fetch(`https://api.nhle.com/stats/rest/en/team`);

        if (!response.ok) {
            Log.error(`Initializing NHL teams failed: ${response.status} ${response.statusText}`);

            return;
        }

        const { data } = await response.json();

        this.teamMapping = data.reduce((mapping, team) => {
            mapping[team.id] = { short: team.triCode, name: team.fullName };

            return mapping;
        }, {});
    },

    /**
     * @function fetchSchedule
     * @description Retrieves a list of games from the API with timespan based on config options.
     * @async
     *
     * @returns {object[]} Raw games from API endpoint.
     */
    async fetchSchedule() {
        const date = new Date();
        date.setDate(date.getDate() - this.config.daysInPast);
        const startDate = new Intl.DateTimeFormat('fr-ca', { timeZone: 'America/Toronto' })
            .format(date);

        const url = `https://api-web.nhle.com/v1/schedule/${startDate}`;
        const response = await fetch(url);

        if (!response.ok) {
            Log.error(`Fetching NHL schedule failed: ${response.status} ${response.statusText}. Url: ${url}`);
            return;
        }

        const { gameWeek } = await response.json();

        return gameWeek.map(({ date, games }) => games.map(game => ({ ...game, gameDay: date, gameDate: new Date(game.startTimeUTC) }))).flat();
    },

    /**
     * @function fetchPlayoffs
     * @description Retrieves playoff data from the API.
     * @async
     *
     * @returns {object} Raw playoff data from API endpoint.
     */
    async fetchPlayoffs() {
        // todo: find playoff endpoints in new api
        const response = await fetch(BASE_PLAYOFF_URL);

        if (!response.ok) {
            Log.error(`Fetching NHL playoffs failed: ${response.status} ${response.statusText}.`);
            return;
        }

        const playoffs = await response.json();
        playoffs.rounds.sort((a, b) => a.number <= b.number ? 1 : -1);
        return playoffs;
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

        const homeTeam = this.teamMapping[game.home_team.id].short;
        const awayTeam = this.teamMapping[game.away_team.id].short;

        return focus.includes(homeTeam) || focus.includes(awayTeam);
    },

    /**
     * @function filterRollOverGames
     * @description Helper function to filter games based on rollOver config option.
     *
     * @param {Game[]} games - List of all games.
     *
     * @returns {Game[]} List of filtered games.
     */
    filterRollOverGames(games) {
        if (!this.config.rollOver) {
            return games;
        }

        const date = new Intl.DateTimeFormat('fr-ca', { timeZone: 'America/Toronto' })
            .format(new Date());

        const yesterday = games.filter(game => game.gameDay < date);
        const today = games.filter(game => game.gameDay === date);
        const tomorrow = games.filter(game => game.gameDay > date);

        const ongoingStates = ['OFF', 'CRIT', 'LIVE'];

        if (today.some(game => ongoingStates.includes(game.gameState))) {
            return [...today, ...tomorrow];
        }

        return [...yesterday, ...today];
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
        const game = schedule.find(game => game.gameState !== 'OFF') || schedule[schedule.length - 1];

        if (game) {
            return {
                year: `${game.season.toString().slice(2, 4)}/${game.season.toString().slice(6, 8)}`,
                mode: game.gameType
            };
        }

        const year = new Date().getFullYear();
        const currentYear = year.toString().slice(-2);
        const nextYear = (year + 1).toString().slice(-2);

        return {
            year: `${currentYear}/${nextYear}`,
            mode: 1
        };
    },

    /**
     * @function computePlayoffDetails
     * @description Computes current playoff details from list of series.
     *
     * @param {object} playoffData - List of raw series from API endpoint.
     *
     * @returns {Series[]} Current season details.
     */
    computePlayoffDetails(playoffData) {
        if (!playoffData || !playoffData.rounds) {
            return [];
        }
        const series = [];
        playoffData.rounds.forEach(r => {
            r.series.forEach(s => {
                const parsed = this.parseSeries(s);
                if (parsed) {
                    series.push(parsed);
                }
            });
        });
        return series;
    },

    /**
     * @function parseTeam
     * @description Transforms raw team information for easier usage.
     *
     * @param {object} team - Both teams in raw format.
     *
     * @returns {Team} Parsed team information.
     */
    parseTeam(team) {
        if (!team) {
            Log.error('no team given');
            return {};
        }
        return {
            id: team.id,
            name: this.teamMapping[team.id].name,
            short: team.abbrev,
            score: team.score ?? 0
        };
    },

    /**
     * @function parsePlayoffTeam
     * @description Transforms raw game information for easier usage.
     *
     * @param {object} rawTeam - Raw team information.
     *
     * @param {object} game - Raw game information.
     *
     * @returns {Game} Parsed game information.
     */
    parsePlayoffTeam(rawTeam, game) {
        const team = this.parseTeam(rawTeam);
        if (game.seriesStatus.topSeedTeamId === team.id) {
            team.score = game.seriesStatus.topSeedWins;
        } else {
            team.score = game.seriesStatus.bottomSeedWins;
        }
        return team;
    },

    /**
     * @function parseGame
     * @description Transforms raw game information for easier usage.
     *
     * @param {object} game - Raw game information.
     *
     * @returns {Game} Parsed game information.
     */
    parseGame(game = {}) {
        return {
            id: game.id,
            timestamp: game.gameDate,
            gameDay: game.gameDay,
            gameState: game.gameState,
            teams: {
                away: this.parseTeam(game.awayTeam),
                home: this.parseTeam(game.homeTeam)
            },
            live: {
                period: this.getNumberWithOrdinal(game.periodDescriptor.number),
                periodType: game.periodDescriptor.periodType,
                timeRemaining: '?' // todo: unavailable in new api?
            }
        };
    },

    /**
     * @function getNumberWithOrdinal
     * @description Converts a raw number into a number with appropriate English ordinal suffix.
     *
     * @param {number} n - The number to apply an ordinal suffix to.
     *
     * @returns {string} The given number with its ordinal suffix appended.
     */
    getNumberWithOrdinal(n) {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    },

    /**
     * @function parseSeries
     * @description Transforms raw series information for easier usage.
     *
     * @param {object} series - Raw series information.
     *
     * @returns {Series} Parsed series information.
     */
    parseSeries(series = {}) {
        if (!series.matchupTeams || series.matchupTeams.length === 0) {
            return null;
        }
        return {
            number: series.number,
            round: series.round.number,
            teams: {
                home: this.parsePlayoffTeam(series.matchupTeams, undefined),
                away: this.parsePlayoffTeam(series.matchupTeams, undefined),
            }
        }
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
        this.nextGame = games.find(game => game.gameState === 'FUT');
        this.liveGames = games.filter(game => game.gameState === 'LIVE' || game.gameState === 'CRIT');
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
        const schedule = await this.fetchSchedule();
        schedule.sort(this.sortGamesByTimestampAndID);
        const season = this.computeSeasonDetails(schedule);

        const focusSchedule = schedule.filter(this.filterGameByFocus.bind(this));

        const games = focusSchedule.map(this.parseGame.bind(this));

        const rollOverGames = this.filterRollOverGames(games);

        this.setNextandLiveGames(rollOverGames);
        this.sendSocketNotification('SCHEDULE', { games: rollOverGames, season });
        if (season.mode === 3 || games.length === 0) {

            const playoffData = await this.fetchPlayoffs();
            const playoffSeries = this.computePlayoffDetails(playoffData).filter(s => s.round >= playoffData.defaultRound);

            this.sendSocketNotification('PLAYOFFS', playoffSeries);
        }
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
        const gameAboutToStart = this.nextGame && new Date() > new Date(this.nextGame.timestamp);

        if (hasLiveGames || gameAboutToStart) {
            return this.updateSchedule();
        }
    }
});
