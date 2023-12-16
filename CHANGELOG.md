# MMM-NHL Changelog

## [2.4.0]

Thanks to @parnic @dannoh for their contributions.

### Fixed

* Updated module to work with the new NHL API.

## [2.3.1]

Thanks to @parnic @dannoh @timpeer for their contributions.

### Added

* Finnish translations

### Fixed

* Team logo images for the 2023-2024 season

## [2.3.0]

### Changed

* Updated dependencies
* Updated Github config files
* Updated project config files
* Uniform spelling for MagicMirror²

### Fixed

* Playoff series display

## [2.2.0]

MagicMirror² version >= 2.15.0 required.

### Added

* Added new config option `showPlayoffSeries` to display playoff series information

### Changed

* Node helper logs are now done through MagicMirror logger
* Updated project config files
* Updated Github config files

### Fixed

* Changed Logo Urls to support all teams (specifically all-star teams)
* Added support for teams with no short name when showNames is true

## [2.1.0]

### Fixed

* Date queries are now set based on timezone `America/Toronto`.

### Added

* Config option `rollOver`

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
