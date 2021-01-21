/* global Class */
/* Magic Mirror
 * Module: MMM-NHL
 *
 * By fewieden https://github.com/fewieden/MMM-NHL
 * MIT Licensed.
 */

/* eslint-env node */
const Log = require("../../../js/logger");
var GameProvider = Class.extend({
	config: null,
	teams: [],
	
	init: function (config, teams) {
		this.config = config;
		this.teams = teams;
		Log.info(`GameProvider: ${this.name} initialized.`);
	},

	fetch: function () {
		Log.warn(`GameProvider: ${this.name} does not subclass fetch method.`);
	},

	fetchSeason: function (games) {
		Log.warn(`GameProvider: ${this.name} does not subclass getSeason method.`);
	},

});

GameProvider.providers = [];

GameProvider.register = function (identifier, provider) {
	Log.info(`MMM-NHL: Registering ${identifier}`);
	GameProvider.providers[identifier.toLowerCase()] = GameProvider.extend(provider);
};

GameProvider.initialize = function (identifier, config, teams) {
	Log.info(`MMM-NHL: Initializing ${identifier}`);
	var provider = new GameProvider.providers[identifier.toLowerCase()];
	provider.init(config, teams);
	return provider;
}

module.exports = GameProvider;