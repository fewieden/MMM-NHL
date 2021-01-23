# MMM-NHL Changelog

## [2.0.0]

### Added

* Nunjuck templates
* French translations thanks to [matlem037](https://github.com/matlem037)
* Dependency `node-fetch`
* Config option `daysInPast`
* Config option `daysAhead`
* Config option `liveReloadInterval`
* Config option `showNames`
* Config option `showLogos`
* Support for game status `postponed`
* Github actions (linting and changelog enforcer)
* JSDoc documentation

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
