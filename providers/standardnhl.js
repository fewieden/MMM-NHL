/* Magic Mirror
 * Module: MMM-NHL
 *
 * By fewieden https://github.com/fewieden/MMM-NHL
 * MIT Licensed.
 */

/* eslint-env node */

const BASE_URL = 'https://statsapi.web.nhl.com/api/v1';
const GameProvider = require('./gameprovider.js');
const {GameStatus, LiveGameInfo, Teams, Team, Season} = require('./providerModels.js');
const {NhlGame} = require('./nhlgame.js');

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

const standardNhlProvider = {
    name: 'StandardNhl',

    createTeamMapping() {
        this.teamMapping = this.teams.reduce((mapping, team) => {
            mapping[team.id] = team.abbreviation;
            return mapping;
        }, {});
    },

    /**
     * @function fetch
     * @description Retrieves a list of games from the API with timespan based on config options.
     * @async
     *
     * @returns {Game[]} Games from API endpoint.
     */
    async fetch() {
        const date = new Date();
        date.setDate(date.getDate() - this.config.daysInPast);
        const startDate = date.toISOString().slice(0, 10);
        date.setDate(date.getDate() + this.config.daysInPast + this.config.daysAhead);
        const endDate = date.toISOString().slice(0, 10);

        const query = qs.stringify({startDate, endDate, expand: 'schedule.linescore'});
        const url = `${BASE_URL}/schedule?${query}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`Fetching standard NHL schedule failed: ${response.status} ${response.statusText}. Url: ${url}`);
            return;
        }

        const {dates} = await response.json();

        return dates.map(date => date.games.map(this.parseGame.bind(this))).flat();
    },

    /**
     * @function fetchSchedule
     * @description Retrieves a list of games from the API with timespan based on config options.
     * @async
     *
     * @param {Game[]} games - All current games
     * @returns {Season} The current season
     */
    async fetchSeason(games) {
        // TODO: this should be the most recent 'Final'
        const game = games.find(game => game.status.abstractGameState !== 'Final') || games.length > 0 && games[games.length - 1];

        if (game) {
            return new Season(`${game.season.slice(2, 4)}/${game.season.slice(6, 8)}`, game.gameType);
        }

        const url = `${BASE_URL}/seasons/current}`;
        const response = await fetch(url);
        const season = await response.json();
        const date = new Date();
        const end = new Date(season.regularSeasonEndDate);
        const start = new Date(season.regularSeasonStartDate);

        const year = `${season.seasonId.slice(0, 4)}/${season.seasonId.slice(4)}`;
        const mode = date >= start && date <= end
            ? 'R'
            : date >= end
                ? 'P'
                : 'PR';
        return new Season(year, mode);
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
        return new Team(teams[type].team.id, teams[type].team.name, this.teamMapping[teams[type].team.id], teams[type].score);
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
        const result = new NhlGame();
        if (!this.teamMapping) {
            this.createTeamMapping();
        }
        result.id = game.gamePk;
        result.season = game.season;
        result.gameType = game.gameType;
        result.gameDate = new Date(game.gameDate);
        result.status = new GameStatus(game.status.abstractGameState, game.status.detailedState);
        result.teams = new Teams(this.parseTeam(game.teams, 'home'), this.parseTeam(game.teams, 'away'));
        result.live = new LiveGameInfo(game.linescore.currentPeriodOrdinal, game.linescore.currentPeriodTimeRemaining)
        return result;
    },
};

GameProvider.register('StandardNhl', standardNhlProvider)

module.exports = standardNhlProvider;
