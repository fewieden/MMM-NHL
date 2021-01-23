/* Magic Mirror
 * Module: MMM-NHL
 *
 * By fewieden https://github.com/fewieden/MMM-NHL
 * MIT Licensed.
 */

/* eslint-env node */

const NodeHelper = require('node_helper');
const fetch = require('node-fetch');
const GameProvider = require('./providers/gameprovider.js');

const BASE_URL = 'https://statsapi.web.nhl.com/api/v1';

module.exports = NodeHelper.create({
    games: [],
    season: {},
    nextGame: null,
    liveGames: [],
    provider: null,
    teams: [],

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

        this.sendSocketNotification('TEAM_MAPPING', this.teamMapping);
        return teams;
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
        const schedule = await this.provider.fetch();
        schedule.sort(this.sort);
        const season = await this.provider.fetchSeason(schedule);

        const focusSchedule = schedule.filter(this.filterGameByFocus.bind(this));

        this.setNextGame(focusSchedule);
        this.sendSocketNotification('SCHEDULE', {games: schedule, season});
    },

    fetchOnLiveState() {
        const hasLiveGames = this.liveGames.length > 0;
        const gameAboutToStart = this.nextGame && new Date() > new Date(this.nextGame.gameDate);

        if (hasLiveGames || gameAboutToStart) {
            return this.updateSchedule();
        }
    }
});
