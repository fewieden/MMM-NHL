/* Magic Mirror
 * Module: MMM-NHL
 *
 * By fewieden https://github.com/fewieden/MMM-NHL
 * MIT Licensed.
 */

/* eslint-env node */

const {Game} = require('./providerModels');

class NhlGame extends Game {
    constructor() {
        super();
        this.season = null;
    }
}

module.exports = {NhlGame};
