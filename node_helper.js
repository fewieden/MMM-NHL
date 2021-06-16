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
 * @external querystring
 * @see https://nodejs.org/api/querystring.html
 */
const qs = require('querystring');

/**
 * @external node_helper
 * @see https://github.com/MichMich/MagicMirror/blob/master/js/node_helper.js
 */
const NodeHelper = require('node_helper');

const BASE_URL = 'https://statsapi.web.nhl.com/api/v1';
const BASE_PLAYOFF_URL = 'https://statsapi.web.nhl.com/api/v1/tournaments/playoffs?expand=round.series';

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
 * @property {string} gameDay - Game day in format YYYY-MM-DD in north american timezone.
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
 * Derived game details from API endpoint for easier usage.
 *
 * @typedef {object} Series
 * @property {number} number - Game identifier.
 * @property {number} round - Start date of the game in UTC timezone.
 * @property {Team} teams.away - Contains information about the away team.
 * @property {Team} teams.home - Contains information about the home team.
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
        const startDate = new Intl.DateTimeFormat('fr-ca', {timeZone: 'America/Toronto'})
            .format(date);

        date.setDate(date.getDate() + this.config.daysInPast + this.config.daysAhead);
        const endDate = new Intl.DateTimeFormat('fr-ca', {timeZone: 'America/Toronto'})
            .format(date);

        const query = qs.stringify({startDate, endDate, expand: 'schedule.linescore'});
        const url = `${BASE_URL}/schedule?${query}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`Fetching NHL schedule failed: ${response.status} ${response.statusText}. Url: ${url}`);
            return;
        }

        const {dates} = await response.json();

        return dates.map(({date, games}) => games.map(game => ({...game, gameDay: date}))).flat();
    },

    /**
     * @function fetchPlayoffs
     * @description Retrieves playoff data from the API.
     * @async
     *
     * @returns {object} Raw playoff data from API endpoint.
     */
    async fetchPlayoffs() {
        const response = await fetch(BASE_PLAYOFF_URL);

        if (!response.ok) {
            console.error(`Fetching NHL playoffs failed: ${response.status} ${response.statusText}. Url: ${BASE_PLAYOFF_URL}`);
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

        const homeTeam = this.teamMapping[game.teams.home.team.id];
        const awayTeam = this.teamMapping[game.teams.away.team.id];

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

        const date = new Intl.DateTimeFormat('fr-ca', {timeZone: 'America/Toronto'})
            .format(new Date());

        const yesterday = games.filter(game => game.gameDay < date);
        const today = games.filter(game => game.gameDay === date);
        const tomorrow = games.filter(game => game.gameDay > date);

        const ongoingStates = ['Final', 'Live'];

        if (today.some(game => ongoingStates.includes(game.status.abstract))) {
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
     * @function computePlayoffDetails
     * @description Computes current playoff details from list of series.
     *
     * @param {object} playoffData - List of raw series from API endpoint.
     *
     * @returns {Series[]} Current season details.
     */
    computePlayoffDetails(playoffData) {
        if (!playoffData || !playoffData.rounds)
            return [];
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
     * @param {object} teams - Both teams in raw format.
     * @param {string} type - Type of team: away or home.
     *
     * @returns {Team} Parsed team information.
     */
    parseTeam(teams = {}, type) {
        const team = teams[type];
        if (!team) {
            console.error({NoTeamFond: teams});
            return {};
        }
        return {
            id: team.team.id,
            name: team.team.name,
            short: this.teamMapping[team.team.id],
            score: team.score
        };
    },

    /**
     * @function parsePlayoffTeam
     * @description Transforms raw game information for easier usage.
     *
     * @param {object} teamData - Raw game information.
     * 
     * @param {number} index - Which index of teamData to operate on.
     *
     * @returns {Game} Parsed game information.
     */
    parsePlayoffTeam(teamData = {}, index) {
        const team = this.parseTeam(teamData, index);
        team.score = teamData[index].seriesRecord.wins;
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
            id: game.gamePk,
            timestamp: game.gameDate,
            gameDay: game.gameDay,
            status: {
                abstract: game.status.abstractGameState,
                detailed: game.status.detailedState
            },
            teams: {
                away: this.parseTeam(game.teams, 'away'),
                home: this.parseTeam(game.teams, 'home')
            },
            live: {
                period: game.linescore.currentPeriodOrdinal,
                timeRemaining: game.linescore.currentPeriodTimeRemaining
            }
        };
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
        if (!series.matchupTeams || series.matchupTeams.length === 0)
            return null;
        return {
            number: series.number,
            round: series.round.number,
            teams: {
                home: this.parsePlayoffTeam(series.matchupTeams, 0),
                away: this.parsePlayoffTeam(series.matchupTeams, 1),
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
        const schedule = await this.fetchSchedule();
        schedule.sort(this.sortGamesByTimestampAndID);
        const season = this.computeSeasonDetails(schedule);

        const focusSchedule = schedule.filter(this.filterGameByFocus.bind(this));

        const games = focusSchedule.map(this.parseGame.bind(this));

        const rollOverGames = this.filterRollOverGames(games);

        this.setNextandLiveGames(rollOverGames);
        this.sendSocketNotification('SCHEDULE', {games: rollOverGames, season});
        if (season.mode === 'P' || games.length === 0) {

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
