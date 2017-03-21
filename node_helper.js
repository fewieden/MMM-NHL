/* Magic Mirror
 * Module: MMM-NHL
 *
 * By fewieden https://github.com/fewieden/MMM-NHL
 * MIT Licensed.
 */

/* eslint-env node */

const request = require('request');
const moment = require('moment-timezone');
const NodeHelper = require('node_helper');

module.exports = NodeHelper.create({

    url: 'http://live.nhle.com/GameData/RegularSeasonScoreboardv3.jsonp',
    scores: [],
    details: {},
    nextMatch: null,
    live: {
        state: false,
        matches: []
    },

    start() {
        console.log(`Starting module helper: ${this.name}`);
    },

    socketNotificationReceived(notification, payload) {
        if (notification === 'CONFIG') {
            this.config = payload.config;
            this.teams = payload.teams;
            this.getData();
            setInterval(() => {
                this.getData();
            }, this.config.reloadInterval);
            setInterval(() => {
                this.fetchOnLiveState();
            }, 60 * 1000);
        }
    },

    getData() {
        request({ url: this.url }, (error, response, body) => {
            if (response.statusCode === 200) {
                // eslint-disable-next-line no-new-func
                const f = new Function('loadScoreboard', body);
                f((data) => {
                    if (Object.prototype.hasOwnProperty.call(data, 'games')) {
                        this.scores = [];
                        for (let i = data.games.length - 1; i >= 0; i -= 1) {
                            if (!this.config.focus_on ||
                                this.config.focus_on.includes(this.teams[data.games[i].htv]) ||
                                this.config.focus_on.includes(this.teams[data.games[i].atv])) {
                                if (data.games[i].tsc !== 'final' || i === data.games.length - 1) {
                                    const id = data.games[i].id.toString();
                                    this.details = {
                                        y: id.slice(0, 4),
                                        t: id.slice(4, 6)
                                    };
                                }
                                this.scores.unshift(data.games[i]);
                            }
                        }
                        this.setMode();
                        this.sendSocketNotification('SCORES', { scores: this.scores, details: this.details });
                    } else {
                        console.log('Error no NHL data');
                    }
                });
            } else {
                console.log(`Error getting NHL scores ${response.statusCode}`);
            }
        });
    },

    setMode() {
        let allEnded = true;
        let next = null;
        const now = Date.now();
        const inGame = 'progress';
        const ended = 'final';
        for (let i = 0; i < this.scores.length; i += 1) {
            const temp = this.scores[i];
            if (this.scores[i].bsc === '') {
                const time = temp.bs.split(' ')[0].split(':');
                const mom = moment().tz('America/Los_Angeles');
                if (temp.ts !== 'TODAY') {
                    const date = temp.ts.split(' ')[1].split('/');
                    mom.set('month', date[0]);
                    mom.set('date', date[1]);
                    mom.subtract(1, 'month');
                }
                mom.set('hour', time[0]);
                mom.set('minute', time[1]);
                mom.set('second', 0);
                if (temp.bs.slice(-2) === 'PM') {
                    mom.add(12, 'hours');
                }
                this.scores[i].starttime = mom;
                allEnded = false;
                if (next === null) {
                    next = this.scores[i];
                }
            } else if ((inGame === this.scores[i].bsc || Date.parse(this.scores[i].starttime) > now) &&
                this.live.matches.indexOf(this.scores[i].id) === -1) {
                allEnded = false;
                this.live.matches.push(this.scores[i].id);
                this.live.state = true;
            } else if (ended === this.scores[i].bsc && this.live.matches.includes(this.scores[i].id)) {
                this.live.matches.splice(this.live.matches.indexOf(this.scores[i].id), 1);
                if (this.live.matches.length === 0) {
                    this.live.state = false;
                }
            }
        }

        if (allEnded === true) {
            this.nextMatch = null;
        }

        if ((next !== null && this.nextMatch === null && allEnded === false) || this.live.state === true) {
            this.nextMatch = {
                id: next.id,
                time: next.starttime
            };
        }
    },

    fetchOnLiveState() {
        if (this.live.state === true) {
            this.getData();
        }
    }
});
