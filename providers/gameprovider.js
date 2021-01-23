/* global Class */
/* Magic Mirror
 * Module: MMM-NHL
 *
 * By fewieden https://github.com/fewieden/MMM-NHL
 * MIT Licensed.
 */

/* eslint-env node */

const Log = require('../../../js/logger');

const GameProvider = Class.extend({
    config: null,
    teams: [],
    name: null,

    init: (config, teams) => {        
        this.config = config;
        this.teams = teams;
        Log.info(`GameProvider: ${name} initialized.`);
    },

    fetch: () => {
        Log.warn(`GameProvider: ${name} does not subclass fetch method.`);
    },


    // eslint-disable-next-line
    fetchSeason: (games) => {
        Log.warn(`GameProvider: ${name} does not subclass getSeason method.`);
    },

});

GameProvider.providers = [];

GameProvider.register = (identifier, provider) => {
    Log.info(`MMM-NHL: Registering ${identifier}`);
    GameProvider.providers[identifier.toLowerCase()] = GameProvider.extend(provider);
};

GameProvider.initialize = (identifier, config, teams) => {
    Log.info(`MMM-NHL: Initializing ${identifier}`);
    const provider = new GameProvider.providers[identifier.toLowerCase()];
    provider.init(config, teams);
    return provider;
}

module.exports = GameProvider;