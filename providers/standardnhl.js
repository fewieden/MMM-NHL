/* global GameProvider, Game */
/* Magic Mirror
 * Module: MMM-NHL
 *
 * By fewieden https://github.com/fewieden/MMM-NHL
 * MIT Licensed.
 */

/* eslint-env node */


const BASE_URL = 'https://statsapi.web.nhl.com/api/v1';
const GameProvider = require("./gameprovider.js");
const { Game, Team, Season } = require("./game.js");
const fetch = require('node-fetch');
const qs = require('querystring');

GameProvider.register("StandardNhl", {
    name: "StandardNhl",
    createTeamMapping() {
        this.teamMapping = this.teams.reduce((mapping, team) => {
            mapping[team.id] = team.abbreviation;

            return mapping;
        }, {});
    },
    async fetch() {
        const date = new Date();
        date.setDate(date.getDate() - this.config.daysInPast);
        const startDate = date.toISOString().slice(0, 10);
        date.setDate(date.getDate() + this.config.daysInPast + this.config.daysAhead);
        const endDate = date.toISOString().slice(0, 10);

        const query = qs.stringify({ startDate, endDate, expand: 'schedule.linescore' });
        const url = `${BASE_URL}/schedule?${query}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`Fetching standard NHL schedule failed: ${response.status} ${response.statusText}. Url: ${url}`);
            return;
        }

        const { dates } = await response.json();

        return dates.map(date => date.games.map(this.parseGame.bind(this))).flat();
    },

    async fetchSeason(games) {
        //TODO: this should be the most recent 'Final'
        const game = games.find(game => game.status.abstractGameState !== 'Final') || (schedule.length > 0 && schedule[schedule.length - 1]);

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
            ? "R"
            : date >= end
                ? "P"
                : "PR";
        return new Season(year, mode);
    },

    parseTeam(teams = {}, type) {
        return new Team(teams[type].team.id, teams[type].team.name, this.teamMapping[teams[type].team.id], teams[type].score);
    },


    parseGame(game = {}) {
        const result = new Game();
        if (!this.teamMapping)
            this.createTeamMapping();
        result.id = game.gamePk;
        result.season = game.season;
        result.gameType = game.gameType;
        result.gameDate = game.gameDate;
        result.status = {
            abstract: game.status.abstractGameState,
            detailed: game.status.detailedState
        };
        result.teams = {
            away: this.parseTeam(game.teams, 'away'),
            home: this.parseTeam(game.teams, 'home')
        };
        result.live = {
            period: game.linescore.currentPeriodOrdinal,
            timeRemaining: game.linescore.currentPeriodTimeRemaining
        };
        return result;
    },
})