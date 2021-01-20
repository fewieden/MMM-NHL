/* Magic Mirror
 * Module: MMM-NHL
 *
 * By fewieden https://github.com/fewieden/MMM-NHL
 * MIT Licensed.
 */

/* eslint-env node */

const fetch = require('node-fetch');
const qs = require('querystring');
const NodeHelper = require('node_helper');

const BASE_URL = 'https://statsapi.web.nhl.com/api/v1';

module.exports = NodeHelper.create({
    games: [],
    season: {},
    nextGame: null,
    liveGames: [],

    async socketNotificationReceived(notification, payload) {
        if (notification === 'CONFIG') {
            this.config = payload.config;
            this.teams = payload.teams;

            await this.initTeams();

            await this.updateSchedule();
            setInterval(() => this.updateSchedule(), this.config.reloadInterval);
            setInterval(() => this.fetchOnLiveState(), this.config.liveReloadInterval);
        }
    },

    async initTeams() {
        const response = await fetch(`${BASE_URL}/teams`);

        if (!response.ok) {
            console.error(`Initializing NHL teams failed: ${response.status} ${response.statusText}`);

            return;
        }

        const { teams } = await response.json();

        this.teamMapping = teams.reduce((mapping, team) => {
            mapping[team.id] = team.abbreviation;

            return mapping;
        }, {});

        this.sendSocketNotification('TEAM_MAPPING', this.teamMapping);
    },

    async fetchSchedule() {
        const date = new Date();
        date.setDate(date.getDate() - this.config.daysInPast);
        const startDate = date.toISOString().slice(0, 10);
        date.setDate(date.getDate() + this.config.daysInPast + this.config.daysAhead);
        const endDate = date.toISOString().slice(0, 10);

        const query = qs.stringify({ startDate, endDate, expand: 'schedule.linescore' });
        const url = `${BASE_URL}/schedule?${query}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`Fetching NHL schedule failed: ${response.status} ${response.statusText}. Url: ${url}`);
            return;
        }

        const { dates } = await response.json();

        return dates.map(date => date.games).flat();
    },

    filterGameByFocus(game) {
        const focus = this.config.focus_on;
        if (!focus) {
            return true;
        }

        const homeTeam = this.teamMapping[game.teams.home.team.id];
        const awayTeam = this.teamMapping[game.teams.away.team.id];

        return focus.includes(homeTeam) || focus.includes(awayTeam);
    },

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

    parseGame(game = {}) {
        return {
            id: game.gamePk,
            timestamp: game.gameDate,
            status: {
                abstract: game.status?.abstractGameState,
                detailed: game.status?.detailedState
            },
            teams: {
                away: {
                    id: game.teams?.away?.team?.id,
                    name: game.teams?.away?.team?.name,
                    short: this.teamMapping[game.teams?.away?.team?.id],
                    score: game.teams?.away?.score
                },
                home: {
                    id: game.teams?.home?.team?.id,
                    name: game.teams?.home?.team?.name,
                    short: this.teamMapping[game.teams?.home?.team?.id],
                    score: game.teams?.home?.score
                }
            },
            live: {
                period: game.linescore?.currentPeriodOrdinal,
                timeRemaining: game.linescore?.currentPeriodTimeRemaining
            }
        };
    },

    setNextGame(games) {
        this.nextGame = games.find(game => game?.status?.abstract === 'Preview');
        this.liveGames = games.filter(game => game?.status?.abstract === 'Live');
    },

    sort(game1, game2) {
        if (game1.gameDate === game2.gameDate) {
            return game1.id > game2.id ? 1 : -1;
        }
        return game1.gameDate > game2.gameDate ? 1 : -1;
    },

    async updateSchedule() {
        const schedule = await this.fetchSchedule();
        schedule.sort(this.sort);
        const season = this.computeSeasonDetails(schedule);

        const focusSchedule = schedule.filter(this.filterGameByFocus.bind(this));

        const games = focusSchedule.map(this.parseGame.bind(this));

        this.setNextGame(games);
        this.sendSocketNotification('SCHEDULE', { games, season });
    },

    fetchOnLiveState() {
        const hasLiveGames = this.liveGames.length > 0;
        const gameAboutToStart = this.nextGame && new Date() > new Date(this.nextGame.timestamp);

        if (hasLiveGames || gameAboutToStart) {
            return this.updateSchedule();
        }
    }
});
