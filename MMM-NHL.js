/* Magic Mirror
 * Module: MMM-NHL
 *
 * By fewieden https://github.com/fewieden/MMM-NHL
 * MIT Licensed.
 */

/* global Module Log moment config */

Module.register('MMM-NHL', {

    modes: {
        '01': 'Pre-Season',
        '02': 'Regular-Season',
        '03': 'Playoffs'
    },

    details: {
        y: (new Date()).getFullYear(),
        t: '01'
    },

    states: {
        '1st': '1ST_PERIOD',
        '2nd': '2ND_PERIOD',
        '3rd': '3RD_PERIOD',
        OT: 'OVER_TIME',
        SO: 'SHOOTOUT',
        FINAL: 'FINAL',
        'FINAL OT': 'FINAL_OVERTIME',
        'FINAL SO': 'FINAL_SHOOTOUT'
    },

    teams: {
        avalanche: 'COL',
        blackhawks: 'CHI',
        bluejackets: 'CBJ',
        blues: 'STL',
        bruins: 'BOS',
        canadiens: 'MTL',
        canucks: 'VAN',
        capitals: 'WSH',
        coyotes: 'ARI',
        devils: 'NJD',
        ducks: 'ANA',
        flames: 'CGY',
        flyers: 'PHI',
        hurricanes: 'CAR',
        islanders: 'NYI',
        jets: 'WPG',
        kings: 'LAK',
        lightning: 'TBL',
        mapleleafs: 'TOR',
        oilers: 'EDM',
        panthers: 'FLA',
        penguins: 'PIT',
        predators: 'NSH',
        rangers: 'NYR',
        redwings: 'DET',
        sabres: 'BUF',
        senators: 'OTT',
        sharks: 'SJS',
        stars: 'DAL',
        wild: 'MIN'
    },

    rotateIndex: 0,
    rotateInterval: null,

    defaults: {
        colored: false,
        focus_on: false,
        matches: 6,
        format: 'ddd h:mm',
        rotateInterval: 20 * 1000, // every 20 seconds
        reloadInterval: 30 * 60 * 1000 // every 30 minutes
    },

    getTranslations() {
        return {
            en: 'translations/en.json',
            de: 'translations/de.json'
        };
    },

    getScripts() {
        return ['moment.js'];
    },

    getStyles() {
        return ['font-awesome.css', 'MMM-NHL.css'];
    },

    start() {
        Log.info(`Starting module: ${this.name}`);
        this.sendSocketNotification('CONFIG', { config: this.config, teams: this.teams });
        moment.locale(config.language);
    },

    socketNotificationReceived(notification, payload) {
        if (notification === 'SCORES') {
            this.scores = payload.scores;
            this.details = payload.details;
            this.setRotateInterval();
        }
    },

    setRotateInterval() {
        if (!this.rotateInterval && this.scores.length > this.config.matches) {
            this.rotateInterval = setInterval(() => {
                if (this.rotateIndex + this.config.matches >= this.scores.length) {
                    this.rotateIndex = 0;
                } else {
                    this.rotateIndex = this.rotateIndex + this.config.matches;
                }
                this.updateDom(300);
            }, this.config.rotateInterval);
        } else if (this.scores.length <= this.config.matches) {
            clearInterval(this.rotateInterval);
            this.rotateIndex = 0;
        }
        this.updateDom(300);
    },

    getDom() {
        const wrapper = document.createElement('div');
        const scores = document.createElement('div');
        const header = document.createElement('header');
        header.innerHTML = `NHL ${this.modes[this.details.t]} ${this.details.y}`;
        scores.appendChild(header);

        if (!this.scores) {
            const text = document.createElement('div');
            text.innerHTML = this.translate('LOADING');
            text.classList.add('dimmed', 'light');
            scores.appendChild(text);
        } else {
            const table = document.createElement('table');
            table.classList.add('small', 'table');

            table.appendChild(this.createLabelRow());

            const max = Math.min(this.rotateIndex + this.config.matches, this.scores.length);
            for (let i = this.rotateIndex; i < max; i += 1) {
                this.appendDataRow(this.scores[i], table);
            }

            scores.appendChild(table);
        }

        wrapper.appendChild(scores);

        return wrapper;
    },

    createLabelRow() {
        const labelRow = document.createElement('tr');

        const dateLabel = document.createElement('th');
        const dateIcon = document.createElement('i');
        dateIcon.classList.add('fa', 'fa-calendar');
        dateLabel.appendChild(dateIcon);
        labelRow.appendChild(dateLabel);

        const homeLabel = document.createElement('th');
        homeLabel.innerHTML = this.translate('HOME');
        homeLabel.setAttribute('colspan', 3);
        labelRow.appendChild(homeLabel);

        const vsLabel = document.createElement('th');
        vsLabel.innerHTML = '';
        labelRow.appendChild(vsLabel);

        const awayLabel = document.createElement('th');
        awayLabel.innerHTML = this.translate('AWAY');
        awayLabel.setAttribute('colspan', 3);
        labelRow.appendChild(awayLabel);

        return labelRow;
    },

    appendDataRow(data, appendTo) {
        const row = document.createElement('tr');
        row.classList.add('row');

        const date = document.createElement('td');
        if (data.bsc === 'progress') {
            if (data.ts === 'PRE GAME') {
                date.innerHTML = this.translate('PRE_GAME');
                date.classList.add('dimmed');
            } else if (['1st', '2nd', '3rd'].includes(data.ts.slice(-3))) {
                const third = document.createElement('div');
                third.innerHTML = this.translate(this.states[data.ts.slice(-3)]);
                if (data.ts.slice(0, 3) !== 'END') {
                    third.classList.add('live');
                    date.appendChild(third);
                    const time = document.createElement('div');
                    time.classList.add('live');
                    time.innerHTML = `${data.ts.slice(0, -4)} ${this.translate('TIME_LEFT')}`;
                    date.appendChild(time);
                } else {
                    date.appendChild(third);
                }
            }
        } else if (data.bsc === '' && Object.prototype.hasOwnProperty.call(data, 'starttime')) {
            date.innerHTML = moment(data.starttime).format(this.config.format);
        } else if (data.bsc === 'final') {
            date.innerHTML = this.translate(this.states[data.bs]);
            date.classList.add('dimmed');
        } else {
            date.innerHTML = this.translate('UNKNOWN');
            date.classList.add('dimmed');
        }
        row.appendChild(date);

        const homeTeam = document.createElement('td');
        homeTeam.classList.add('align-right');
        const homeTeamSpan = document.createElement('span');
        homeTeamSpan.innerHTML = this.teams[data.htv];
        homeTeam.appendChild(homeTeamSpan);
        row.appendChild(homeTeam);

        const homeScore = document.createElement('td');
        homeScore.innerHTML = data.hts === '' ? 0 : data.hts;
        row.appendChild(homeScore);

        const vs = document.createElement('td');
        vs.innerHTML = ':';
        row.appendChild(vs);

        const awayScore = document.createElement('td');
        awayScore.innerHTML = data.ats === '' ? 0 : data.ats;
        row.appendChild(awayScore);

        const awayTeam = document.createElement('td');
        awayTeam.classList.add('align-left');
        const awayTeamSpan = document.createElement('span');
        awayTeamSpan.innerHTML = this.teams[data.atv];
        awayTeam.appendChild(awayTeamSpan);
        row.appendChild(awayTeam);

        appendTo.appendChild(row);
    }
});
