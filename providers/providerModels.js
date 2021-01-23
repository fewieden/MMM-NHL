/* Magic Mirror
 * Module: MMM-NHL
 *
 * By fewieden https://github.com/fewieden/MMM-NHL
 * MIT Licensed.
 */

/* eslint-env node */

class Season {
    constructor(year, mode) {
        this.year = year;
        this.mode = mode;
    }
}

class Team {
    constructor(id, name, shortCode, score) {
        this.id = id;
        this.name = name;
        this.shortCode = shortCode;
        this.score = score;
    }
}

class GameStatus {
    constructor(abstract, detailed) {
        this.abstract = abstract;
        this.detailed = detailed;
    }
}

class LiveGameInfo {
    constructor(period, timeRemaining) {
        this.period = period;
        this.timeRemaining = timeRemaining;
    }
}

class Teams {
    constructor(home, away) {
        this.home = home;
        this.away = away;
    }
}

class Game {
    constructor() {
        this.id = null;
        this.gameDate = null;
        this.gameType = null;
        this.status = null;
        this.teams = [];
        this.live = null;
    }
}

module.exports = {Season, Team, Game, Teams, GameStatus, LiveGameInfo};