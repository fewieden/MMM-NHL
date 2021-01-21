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

class Game {
    constructor() {
        this.id = null;
        this.gameDate = null;
        this.season = null;
        this.gameType = null;
        this.status = null;
        this.teams = [];
        this.live = null;
    }
}

module.exports = {Season, Team, Game};