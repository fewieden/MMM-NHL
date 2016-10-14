/* Magic Mirror
 * Module: MMM-NHL
 *
 * By fewieden https://github.com/fewieden/MMM-NHL
 * MIT Licensed.
 */

Module.register("MMM-NHL", {

    modes: {
        "01": "Pre-Season",
        "02": "Regular-Season",
        "03": "Playoffs"
    },

    details: {
        y: (new Date()).getFullYear(),
        t: "01"
    },

    states: {
        "1st": "1ST_PERIOD",
        "2nd": "2ND_PERIOD",
        "3rd": "3RD_PERIOD",
        "OT": "OVER_TIME",
        "SO": "SHOOTOUT",
        "FINAL": "FINAL",
        "FINAL OT": "FINAL_OVERTIME",
        "FINAL SO": "FINAL_SHOOTOUT"
    },

    teams: {
        "avalanche": "COL",
        "blackhawks": "CHI",
        "bluejackets": "CBJ",
        "blues": "STL",
        "bruins": "BOS",
        "canadiens": "MTL",
        "canucks": "VAN",
        "capitals": "WSH",
        "coyotes": "ARI",
        "devils": "NJD",
        "ducks": "ANA",
        "flames": "CGY",
        "flyers": "PHI",
        "hurricanes": "CAR",
        "islanders": "NYI",
        "jets": "WPG",
        "kings": "LAK",
        "lightning": "TBL",
        "mapleleafs": "TOR",
        "oilers": "EDM",
        "panthers": "FLA",
        "penguins": "PIT",
        "predators": "NSH",
        "rangers": "NYR",
        "redwings": "DET",
        "sabres": "BUF",
        "senators": "OTT",
        "sharks": "SJS",
        "stars": "DAL",
        "wild": "MIN"
    },

    defaults: {
        colored: false,
        focus_on: false,
        format: "ddd h:mm",
        reloadInterval: 30 * 60 * 1000       // every 30 minutes
    },

    getTranslations: function () {
        return {
            en: "translations/en.json",
            de: "translations/de.json"
        };
    },

    getScripts: function() {
        return ["moment.js"];
    },

    getStyles: function () {
        return ["font-awesome.css", "MMM-NHL.css"];
    },

    start: function () {
        Log.info("Starting module: " + this.name);
        this.sendSocketNotification("CONFIG", this.config);
        moment.locale(config.language);
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "SCORES") {
            this.scores = payload.scores;
            this.details = payload.details;
            this.updateDom(300);
        }
    },

    getDom: function () {

        var wrapper = document.createElement("div");
        var scores = document.createElement("div");
        var header = document.createElement("header");
        header.innerHTML = "NHL " + this.modes[this.details.t] + " " + this.details.y;
        scores.appendChild(header);

        if (!this.scores) {
            var text = document.createElement("div");
            text.innerHTML = this.translate("LOADING");
            text.classList.add("dimmed", "light");
            scores.appendChild(text);
        } else {
            var table = document.createElement("table");
            table.classList.add("small", "table");

            table.appendChild(this.createLabelRow());

            for (var i = 0; i < this.scores.length; i++) {
                this.appendDataRow(this.scores[i], table);
            }

            scores.appendChild(table);
        }

        wrapper.appendChild(scores);

        return wrapper;
    },

    createLabelRow: function () {
        var labelRow = document.createElement("tr");

        var dateLabel = document.createElement("th");
        var dateIcon = document.createElement("i");
        dateIcon.classList.add("fa", "fa-calendar");
        dateLabel.appendChild(dateIcon);
        labelRow.appendChild(dateLabel);

        var homeLabel = document.createElement("th");
        homeLabel.innerHTML = this.translate("HOME");
        homeLabel.setAttribute("colspan", 3);
        labelRow.appendChild(homeLabel);

        var vsLabel = document.createElement("th");
        vsLabel.innerHTML = "";
        labelRow.appendChild(vsLabel);

        var awayLabel = document.createElement("th");
        awayLabel.innerHTML = this.translate("AWAY");
        awayLabel.setAttribute("colspan", 3);
        labelRow.appendChild(awayLabel);

        return labelRow;
    },

    appendDataRow: function (data, appendTo) {
        if(!this.config.focus_on || this.config.focus_on.indexOf(this.teams[data.htv]) !== -1 || this.config.focus_on.indexOf(this.teams[data.atv]) !== -1) {
            var row = document.createElement("tr");
            row.classList.add("row");

            var date = document.createElement("td");
            if (data.bsc === "progress") {
                if(data.ts === "PRE GAME"){
                    date.innerHTML = this.translate("PRE_GAME");
                    date.classList.add("dimmed");
                } else if(data.ts.slice(-3) in ["1st", "2nd", "3rd"]){
                    var third = document.createElement("div");
                    third.innerHTML = this.translate(this.states[data.ts.slice(-3)]);
                    if (data.ts.slice(0, 3) !== "END") {
                        third.classList.add("live");
                        date.appendChild(third);
                        var time = document.createElement("div");
                        time.classList.add("live");
                        time.innerHTML = data.ts.slice(0, -4) + ' ' + this.translate("TIME_LEFT");
                        date.appendChild(time);
                    } else {
                        date.appendChild(third);
                    }
                }
            } else if (data.bsc === "" && data.hasOwnProperty("starttime")) {
                date.innerHTML = moment(data.starttime).format(this.config.format);
            } else if(data.bsc === "final") {
                date.innerHTML = this.translate(this.states[data.bs]);
                date.classList.add("dimmed");
            } else {
                date.innerHTML = this.translate("UNKNOWN");
                date.classList.add("dimmed");
            }
            row.appendChild(date);

            var homeTeam = document.createElement("td");
            homeTeam.classList.add("align-right");
            var homeTeamSpan = document.createElement("span");
            homeTeamSpan.innerHTML = this.teams[data.htv];
            homeTeam.appendChild(homeTeamSpan);
            row.appendChild(homeTeam);

            var homeLogo = document.createElement("td");
            var homeIcon = document.createElement("img");
            homeIcon.src = this.file("icons/" + this.teams[data.htv] + ".png");
            if (!this.config.colored) {
                homeIcon.classList.add("icon");
            }
            homeLogo.appendChild(homeIcon);
            row.appendChild(homeLogo);

            var homeScore = document.createElement("td");
            homeScore.innerHTML = data.hts === "" ? 0 : data.hts;
            row.appendChild(homeScore);

            var vs = document.createElement("td");
            vs.innerHTML = ":";
            row.appendChild(vs);

            var awayScore = document.createElement("td");
            awayScore.innerHTML = data.ats === "" ? 0 : data.ats;
            row.appendChild(awayScore);

            var awayLogo = document.createElement("td");
            var awayIcon = document.createElement("img");
            awayIcon.src = this.file("icons/" + this.teams[data.atv] + ".png");;
            if (!this.config.colored) {
                awayIcon.classList.add("icon");
            }
            awayLogo.appendChild(awayIcon);
            row.appendChild(awayLogo);

            var awayTeam = document.createElement("td");
            awayTeam.classList.add("align-left");
            var awayTeamSpan = document.createElement("span");
            awayTeamSpan.innerHTML = this.teams[data.atv];
            awayTeam.appendChild(awayTeamSpan);
            row.appendChild(awayTeam);

            appendTo.appendChild(row);
        }
    }
});