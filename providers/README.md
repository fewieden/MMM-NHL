# MMM-NHL Game Provider Development Documentation

This document describes the way to develop your own MMM-NHL game provider.

Table of Contents:

- The game provider file: yourprovider.js
  - [Game provider methods to implement](#game-provider-methods-to-implement)
  - [Game Provider instance methods](#game-provider-instance-methods)
  - [Models](#game)

---

## The game provider file: yourprovider.js

This is the script in which the game provider will be defined. In its most simple form, the game provider must implement the following:

```javascript
GameProvider.register("yourprovider", {
  name: "YourProvider",

  fetch() {},

  fetchSeason(games) {}
});
```

### Game provider methods to implement

#### `fetch()`

This method is called when the MMM-NHL module tries to fetch a current list of games. The implementation of this method is required.
After processing the list of games from your source, it needs to return an array of [Games](#game).

#### `fetchSeason(games)`

This method is called when the MMM-NHL module tries to fetch the the current NHL season. The implementation of this method is required.
This method is passed the list of [Games](#game) from the `fetch()` method and must return a [Season](#season) that corresponds to the current NHL season.  This information is used for the table header.

### Game Provider instance methods

#### `init(config, teams)`

Called when a game provider is initialized. The method is passed the module config and a list of [Teams](#team) that the module uses for displaying data.

### Game

| Property       | Type     | Value                                                                                                           |
| -------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| id             | `string` | A unique identifier for the game.  standardNhl.js uses the nhl game id.                                         |
| gameDate       | `Date`   | Start date and time for the game                                                                                |
| gameType       | `string` | The NHL.com type.  `PR` = pre-season, `R` = regular season, `P` = playoff. [FullList](https://statsapi.web.nhl.com/api/v1/gameTypes) |
| status         | [GameStatus](#gamestatus) | The NHL.com status. [FullList](https://statsapi.web.nhl.com/api/v1/gameStatus)                 |
| teams          | [Teams](#teams) | Home and Away teams                                                                                      |
| live           | [LiveGameInfo](#livegameinfo) | Information for games in progress.                                                         |

### Team

| Property       | Type     | Value                                                                                                           |
| -------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| id             | `string` | NHL.com team id                                                                                                 |
| name           | `string` | Name of the team                                                                                                |
| shortCode      | `string` | Short Name of the team. Example TOR, BOS, WAS                                                                   |
| score          | `number` | Score in the current game                                                                                       |

### Teams
| Property       | Type     | Value                                                                                                           |
| -------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| home           | [Team](#team) | Home team                                                                                                  |
| away           | [Team](#team) | Away team                                                                                                  |

### Season
| Property       | Type     | Value                                                                                                           |
| -------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| year           | `string` | The year of the current season.  Displayed on the table header                                                  |
| mode           | `string` | The current stage of the season. `PR` pre-season, `R` regular season, `P` playoff. Used on the table header     |

### LiveGameInfo
| Property       | Type     | Value                                                                                                           |
| -------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| period         | `string` | Current period of play.  Shown in the game table.                                                               |
| timeRemaining  | `string` | Time remaining in the period. Show in the game table                                                            |

### GameStatus
| Property       | Type     | Value                                                                                                           |
| -------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| abstract       | `string` | `Preview`, `Live`, `Final` are the 3 statuses used.                                                             |
| detailed       | `string` | `Pre-Game`, `Postponed` are the 2 statuses used.                                                                |
