# MMM-NHL Changelog

## [2.0.0]

### Added

* Nunjuck templates
* French translations thanks to [matlem037](https://github.com/matlem037)
* Dependency `node-fetch`
* Config option `daysInPast`
* Config option `daysAhead`
* Config option `liveReloadInterval` thanks to [dannoh](https://github.com/dannoh).
* Config option `showNames` thanks to [dannoh](https://github.com/dannoh).
* Config option `showLogos` thanks to [dannoh](https://github.com/dannoh).
* Support for game status `postponed` thanks to [dannoh](https://github.com/dannoh).
* Github actions (linting and changelog enforcer)
* JSDoc documentation
* Ability to add additional Game data providers
  * standardNhl - Uses config values `daysInPast` and `daysAhead`
  * rollingNhl - Only shows 2 days. Previous & Next, or Current & Next

### Changed

* Switched API for data feed.
* Display logos from remote.
* Retrieve team list from API.
* ESLint recommended instead of airbnb ruleset.

### Removed

* Config option `format`, instead rendering information based on locale.
* Travis integration
* Dependency `moment-timezone`
* Dependency `request`
* Local team logos

## [1.0.1]

### Added

* Added new team: Vegas Golden Knights

## [1.0.0]

Initial version
