/* Magic Mirror
 * Module: MMM-NHL
 *
 * By fewieden https://github.com/fewieden/MMM-NHL
 * MIT Licensed.
 */

const request = require("request");
const moment = require("moment-timezone");
const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({

    url: "http://live.nhle.com/GameData/RegularSeasonScoreboardv3.jsonp",
    scores: [],
    details: {},
    nextMatch: null,
    live: {
        state: false,
        matches: []
    },

    start: function() {
        console.log("Starting module: " + this.name);
    },

    socketNotificationReceived: function(notification, payload) {
        if(notification === "CONFIG"){
            this.config = payload.config;
            this.teams = payload.teams;
            this.getData();
            setInterval(() => {
                this.getData();
            }, this.config.reloadInterval);
            setInterval(() => {
                this.fetchOnLiveState();
            }, 60*1000);
        }
    },

    getData: function() {
        request({url: this.url}, (error, response, body) => {
            if (response.statusCode === 200) {
                var f = new Function("loadScoreboard", body);
                f((data) => {
                    if(data.hasOwnProperty("games")){
                        this.scores = [];
                        for(var i = data.games.length - 1; i >= 0; i--){
                            if(!this.config.focus_on ||
                                this.config.focus_on.indexOf(this.teams[data.games[i].htv]) !== -1 ||
                                this.config.focus_on.indexOf(this.teams[data.games[i].atv]) !== -1) {
                                if (data.games[i].tsc !== "final" || i === data.games.length - 1) {
                                    var id = data.games[i].id + "";
                                    this.details = {
                                        y: id.slice(0, 4),
                                        t: id.slice(4, 6)
                                    };
                                }
                                this.scores.unshift(data.games[i]);
                            }
                        }
                        this.setMode();
                        this.sendSocketNotification("SCORES", {scores: this.scores, details: this.details});
                        return;
                    } else {
                        console.log("Error no NHL data");
                    }
                });
            } else {
                console.log("Error getting NHL scores " + response.statusCode);
            }
        });
    },

    setMode: function(){
        var all_ended = true;
        var next = null;
        var now = Date.now();
        var in_game = "progress";
        var ended = "final";
        for(var i = 0; i < this.scores.length; i++) {
            var temp = this.scores[i];
            if(this.scores[i].bsc === ""){
                var time = temp.bs.split(" ")[0].split(":");
                var mom = moment().tz("America/Los_Angeles");
                if(temp.ts !== "TODAY"){
                    var date = temp.ts.split(" ")[1].split("/");
                    mom.set("month", date[0]);
                    mom.set("date", date[1]);
                    mom.subtract(1, "month");
                }
                mom.set("hour", time[0]);
                mom.set("minute", time[1]);
                mom.set("second", 0);
                if(temp.bs.slice(-2) === "PM"){
                    mom.add(12, "hours");
                }
                this.scores[i].starttime = mom;
                all_ended = false;
                if(next === null){
                    next = this.scores[i];
                }
            } else if((in_game === this.scores[i].bsc || Date.parse(this.scores[i].starttime) > now) && this.live.matches.indexOf(this.scores[i].id) === -1){
                all_ended = false;
                this.live.matches.push(this.scores[i].id);
                this.live.state = true;
            } else if(ended === this.scores[i].bsc && (index = this.live.matches.indexOf(this.scores[i].id)) !== -1){
                this.live.matches.splice(index, 1);
                if(this.live.matches.length === 0){
                    this.live.state = false;
                }
            }
        }

        if(all_ended === true){
            this.nextMatch = null;
        }

        if(next !== null && this.nextMatch === null && all_ended === false || this.live.state === true){
            this.nextMatch = {
                id: next.id,
                time: next.starttime
            }
        }
    },

    fetchOnLiveState: function(){
        if(this.live.state === true){
            this.getData();
        }
    }
});
