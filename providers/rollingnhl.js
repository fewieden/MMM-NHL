/* Magic Mirror
 * Module: MMM-NHL
 *
 * By fewieden https://github.com/fewieden/MMM-NHL
 * MIT Licensed.
 */

/* eslint-env node */

const moment = require('moment-timezone');
const GameProvider = require('./gameprovider.js');
const standardNhlProvider = require('./standardnhl.js');
const fetch = require('node-fetch');
const qs = require('querystring');

const BASE_URL = 'https://statsapi.web.nhl.com/api/v1';

const rollingProvider = standardNhlProvider;
rollingProvider.name = 'RollingNhl';

rollingProvider.fetch = async function () {
    const dateFormat = 'YYYY-MM-DD';
    const date = moment().tz('America/Toronto')
        .add(-1, 'd'); // Yesterday
    const startDate = date.format(dateFormat);
    date.add(2, 'd'); // Tomorrow
    const endDate = date.format(dateFormat);

    const query = qs.stringify({startDate, endDate, expand: 'schedule.linescore'});

    const url = `${BASE_URL}/schedule?${query}`;
    const response = await fetch(url);

    if (!response.ok) {
        console.error(`Fetching standard NHL schedule failed: ${response.status} ${response.statusText}. Url: ${url}`);
        return;
    }

    const {dates} = await response.json();
    if (dates.length > 2) {
        const anyStarted = dates[1].games.some(game => game.status.abstractGameState === 'Final' || game.status.abstractGameState === 'Live');
        if (anyStarted) {
            dates.splice(0, 1);
        } else {
            dates.splice(2, 1);
        }
    }

    return dates.map(date => date.games.map(this.parseGame.bind(this))).flat();
};

GameProvider.register('RollingNhl', rollingProvider);