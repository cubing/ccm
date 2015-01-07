wca = {};

/* From https://www.worldcubeassociation.org/results/misc/export.html

- The result values are in fields value1-value5, best and average.
- Value -1 means DNF
- Value -2 means DNS
- Value 0 means "nothing", for example a best-of-3 has value4=value5=average=0
- Positive values depend on the event, see column "format" in Events.
  - Most events have format "time", where the value represents centiseconds.
    For example, 8653 means 1 minute and 26.53 seconds.
  - Format "number" means the value is a raw number, currently only used
    by "fewest moves" for number of moves.
  - Format "multi" is for old and new multi-blind, encoding not only the time
    but also the number of attempted and solved cubes. Writing the value in
    decimal it is interpreted like this:
      old: 1SSAATTTTT
             solved        = 99 - SS
             attempted     = AA
             timeInSeconds = TTTTT (99999 means unknown)
      new: 0DDTTTTTMM
             difference    = 99 - DD
             timeInSeconds = TTTTT (99999 means unknown)
             missed        = MM
             solved        = difference + missed
             attempted     = solved + missed
    Note that this is designed so that a smaller value means a better result.
*/

var WCA_DNF_VALUE = -1;
var WCA_DNS_VALUE = -2;

wca.solveTimeToWcaValue = function(solveTime) {
  if($.solveTimeIsDNF(solveTime)) {
    return WCA_DNF_VALUE;
  }
  if($.solveTimeIsDNS(solveTime)) {
    return WCA_DNS_VALUE;
  }
  if(solveTime.moveCount) {
    // If moveCount is set, assume we're dealing with an FMC solve.
    return solveTime.moveCount;
  } else if(solveTime.puzzlesAttemptedCount && solveTime.puzzlesAttemptedCount > 1) {
    // If more than one puzzle was attempted, assume it's a MBLD solve.
    assert(solveTime.puzzlesAttemptedCount >= solveTime.puzzlesSolvedCount);

    var puzzlesUnsolvedCount = solveTime.puzzlesAttemptedCount - solveTime.puzzlesSolvedCount;
    var DD = 99 - puzzlesUnsolvedCount;
    var timeInSeconds = Math.floor(solveTime.millis / 1000);

    assert(0 <= puzzlesUnsolvedCount);
    assert(puzzlesUnsolvedCount <= 99);

    assert(0 <= timeInSeconds);
    assert(timeInSeconds < 1e5);

    var wcaValue = 1e7 * DD + 1e2 * timeInSeconds + puzzlesUnsolvedCount;
    return wcaValue;
  } else {
    // Otherwise, it must be a regular solve.
    var millis = solveTime.millis || 0;
    var centiseconds = Math.floor(millis / 10);
    return centiseconds;
  }
};

wca.valueToSolveTime = function(wcaValue, eventId) {
  if(wcaValue == WCA_DNF_VALUE) {
    return {
      puzzlesSolvedCount: 0,
      puzzlesAttemptedCount: 1,
      wcaValue: wcaValue,
    };
  }
  if(wcaValue == WCA_DNS_VALUE) {
    return {
      puzzlesSolvedCount: 0,
      puzzlesAttemptedCount: 0,
      wcaValue: wcaValue,
    };
  }

  if(eventId == '333fm') {
    var moveCount = wcaValue;
    return {
      moveCount: moveCount,
      wcaValue: wcaValue,
    };
  } else if(eventId == '333mbf') {
    // From https://www.worldcubeassociation.org/results/misc/export.html
    var difference = 99 - Math.floor(wcaValue / 1e7);
    wcaValue %= 1e7;

    var timeInSeconds = Math.floor(wcaValue / 1e2);
    wcaValue %= 1e2;

    var missed = wcaValue;
    var solved = difference + missed;
    var attempted = solved + missed;

    return {
      millis: timeInSeconds*1000,
      puzzlesSolvedCount: solved,
      puzzlesAttemptedCount: attempted,
      wcaValue: wcaValue,
    };
  } else {
    var centiseconds = wcaValue;
    return {
      millis: centiseconds*10,
      decimals: 2,
      wcaValue: wcaValue,
    };
  }
};

wca.penalties = {};
_.each([
  'DNF',
  'DNS',

  // All the kinds of +2s the WCA regulations define.
  // Naming convention is as follows:
  //  PLUSTWO_THING_THEY_DID_WRONG
  //
  // https://www.worldcubeassociation.org/regulations/#10e3
  'PLUSTWO_ONE_MOVE_AWAY',
  // https://www.worldcubeassociation.org/regulations/#A3d1
  'PLUSTWO_PUZZLE_ON_TIMER',
  // https://www.worldcubeassociation.org/regulations/#A4b
  'PLUSTWO_START_PALMS_NOT_DOWN',
  // https://www.worldcubeassociation.org/regulations/#A4b1
  'PLUSTWO_START_TOUCHING_PUZZLE',
  // https://www.worldcubeassociation.org/regulations/#A4d1
  'PLUSTWO_START_AFTER_INSPECTION',
  // https://www.worldcubeassociation.org/regulations/#A6c
  'PLUSTWO_STOP_TOUCHING_PUZZLE',
  // https://www.worldcubeassociation.org/regulations/#A6d
  'PLUSTWO_STOP_PALMS_NOT_DOWN',
  // https://www.worldcubeassociation.org/regulations/#A6e
  'PLUSTWO_STOP_TOUCHED_PUZZLE_BEFORE_JUDGE_INSPECTED',
], function(penaltyName) {
  wca.penalties[penaltyName] = penaltyName;
});

wca.roundStatuses = {
  unstarted: 'unstarted',
  open: 'open',
  closed: 'closed',
};

// The various kinds of soft cutoffs we support. Usually, this is the number of
// attempts the competitor gets to beat the "soft cutoff time". However, we
// also support "cumulative time limits":
//  https://www.worldcubeassociation.org/regulations/#A1a2
wca.softCutoffFormats = [
  {
    name: 'cumulative',
    code: 'cumulative',
  },
  {
    name: 'in 1',
    code: '1',
  },
  {
    name: 'in 2',
    code: '2',
  },
  {
    name: 'in 3',
    code: '3',
  }
];
wca.softCutoffFormatByCode = {};
_.each(wca.softCutoffFormats, function(softCutoffFormat) {
  wca.softCutoffFormatByCode[softCutoffFormat.code] = softCutoffFormat;
});

// We don't support qualification rounds (combined or uncombined), and we do
// not support B Finals.
wca.supportedRounds = [
  {
    "combined": "d",
    "uncombined": "1",
  },
  {
    "combined": "e",
    "uncombined": "2",
  },
  {
    "combined": "g",
    "uncombined": "3",
  },
  {
    "combined": "c",
    "uncombined": "f",
  },
];

// https://www.worldcubeassociation.org/regulations/#9p1
wca.MINIMUM_CUTOFF_PERCENTAGE = 25;

// https://www.worldcubeassociation.org/regulations/#9m
wca.MAX_ROUNDS_PER_EVENT = 4;
assert.equal(wca.supportedRounds.length, wca.MAX_ROUNDS_PER_EVENT);
wca.maxRoundsAllowed = function(firstRoundSize) {
  if(firstRoundSize <= 7) {
    return 1;
  } else if(firstRoundSize <= 15) {
    return 2;
  } else if(firstRoundSize <= 99) {
    return 3;
  } else {
    return MAX_ROUNDS;
  }
};


wca.roundByCode = {
  "1": {
    "name": "First round",
    "code": "1",
    "combined": false,

    "supportedRoundIndex": 0
  },
  "d": {
    "name": "Combined First round",
    "code": "d",
    "combined": true,

    "supportedRoundIndex": 0
  },

  "2": {
    "name": "Second round",
    "code": "2",
    "combined": false,

    "supportedRoundIndex": 1
  },
  "e": {
    "name": "Combined Second round",
    "code": "e",
    "combined": true,

    "supportedRoundIndex": 1
  },

  "3": {
    "name": "Semi Final",
    "code": "3",
    "combined": false,

    "supportedRoundIndex": 2
  },
  "g": {
    "name": "Combined Third Round",
    "code": "g",
    "combined": true,

    "supportedRoundIndex": 2
  },

  "f": {
    "name": "Final",
    "code": "f",
    "combined": false,

    "supportedRoundIndex": 3
  },
  "c": {
    "name": "Combined Final",
    "code": "c",
    "combined": true,

    "supportedRoundIndex": 3
  },

  // Unsupported round types
  "0": {
    "name": "Qualification round",
    "code": "0",
    "combined": false
  },
  "h": {
    "name": "Combined qualification",
    "code": "h",
    "combined": true
  },
  "b": {
    "name": "B Final",
    "code": "b",
    "combined": false
  },
};

wca.events = [
  {
    "code": "222",
    "name": "2x2 Cube",
  },
  {
    "code": "333",
    "name": "Rubik's Cube",
  },
  {
    "code": "444",
    "name": "4x4 Cube",
  },
  {
    "code": "555",
    "name": "5x5 Cube",
  },
  {
    "code": "666",
    "name": "6x6 Cube",
  },
  {
    "code": "777",
    "name": "7x7 Cube",
  },
  {
    "code": "333bf",
    "name": "Rubik's Cube: Blindfolded",
  },
  {
    "code": "333oh",
    "name": "Rubik's Cube: One-handed",
  },
  {
    "code": "333fm",
    "name": "Rubik's Cube: Fewest moves",
    solveTimeFields: [ 'moveCount' ],
  },
  {
    "code": "333ft",
    "name": "Rubik's Cube: With feet",
  },
  {
    "code": "minx",
    "name": "Megaminx",
  },
  {
    "code": "pyram",
    "name": "Pyraminx",
  },
  {
    "code": "sq1",
    "name": "Square-1",
  },
  {
    "code": "clock",
    "name": "Rubik's Clock",
  },
  {
    "code": "skewb",
    "name": "Skewb",
  },
  {
    "code": "444bf",
    "name": "4x4 Cube: Blindfolded",
  },
  {
    "code": "555bf",
    "name": "5x5 Cube: Blindfolded",
  },
  {
    "code": "333mbf",
    "name": "Rubik's Cube: Multiple Blindfolded",
    solveTimeFields: [ 'millis', 'puzzlesSolvedCount', 'puzzlesAttemptedCount' ],
  },
];

wca.eventByCode = {};
_.each(wca.events, function(event) {
  wca.eventByCode[event.code] = event;
});

wca.formats = [
  {
    "name": "Best of 1",
    "shortName": "Bo1",
    "count": 1,
    "code": "1",
    "softCutoffFormatCodes": [],
    "averageName": "",
    "sortBy": "best",
  },
  {
    "name": "Best of 2",
    "shortName": "Bo2",
    "count": 2,
    "code": "2",
    "softCutoffFormatCodes": [ 'cumulative', '1' ],
    "averageName": "",
    "sortBy": "best",
  },
  {
    "name": "Best of 3",
    "shortName": "Bo3",
    "count": 3,
    "code": "3",
    "softCutoffFormatCodes": [ 'cumulative', '1', '2' ],

    // 333bf is a best of 3, but people do get a mean, even though we don't
    // sort by it.
    "averageName": "Mean",
    "sortBy": "best",
  },
  {
    "name": "Average of 5",
    "shortName": "Ao5",
    "count": 5,
    "code": "a",
    "softCutoffFormatCodes": [ 'cumulative', '1', '2', '3' ],

    "averageName": "Average",
    "sortBy": "average",
  },
  {
    "name": "Mean of 3",
    "shortName": "Mo3",
    "count": 3,
    "code": "m",
    "softCutoffFormatCodes": [ 'cumulative', '1', '2' ],

    "averageName": "Mean",
    "sortBy": "average",
  },
];

wca.formatByCode = {};
_.each(wca.formats, function(format) {
  wca.formatByCode[format.code] = format;
});

// Maps event codes to an array of allowed formats, in decreasing order of
// preference. Built from https://www.worldcubeassociation.org/regulations/#9b
wca.formatsByEventCode = {
  // https://www.worldcubeassociation.org/regulations/#9b1
  "333":    [ 'a', '3', '2', '1' ],
  "222":    [ 'a', '3', '2', '1' ],
  "444":    [ 'a', '3', '2', '1' ],
  "555":    [ 'a', '3', '2', '1' ],
  "clock":  [ 'a', '3', '2', '1' ],
  "minx":   [ 'a', '3', '2', '1' ],
  "pyram":  [ 'a', '3', '2', '1' ],
  "sq1":    [ 'a', '3', '2', '1' ],
  "skewb":  [ 'a', '3', '2', '1' ],
  "333oh":  [ 'a', '3', '2', '1' ],

  // https://www.worldcubeassociation.org/regulations/#9b2
  "333ft":  [ 'm', '2', '1' ],
  "333fm":  [ 'm', '2', '1' ],
  "666":    [ 'm', '2', '1' ],
  "777":    [ 'm', '2', '1' ],

  // https://www.worldcubeassociation.org/regulations/#9b3
  "333bf":  [ '3', '2', '1' ],
  "444bf":  [ '3', '2', '1' ],
  "555bf":  [ '3', '2', '1' ],
  "333mbf": [ '3', '2', '1' ],
};

wca.eventAllowsCutoffs = function(eventCode) {
  return eventCode != '333fm';
};

// https://www.worldcubeassociation.org/regulations/#A1a1
wca.DEFAULT_HARD_CUTOFF_SECONDS_BY_EVENTCODE = {};
_.each(_.keys(wca.formatsByEventCode), function(eventCode) {
  wca.DEFAULT_HARD_CUTOFF_SECONDS_BY_EVENTCODE[eventCode] = 10*60;
});
wca.DEFAULT_HARD_CUTOFF_SECONDS_BY_EVENTCODE['444bf'] = 60*60;
wca.DEFAULT_HARD_CUTOFF_SECONDS_BY_EVENTCODE['555bf'] = 60*60;
wca.DEFAULT_HARD_CUTOFF_SECONDS_BY_EVENTCODE['333mbf'] = 60*60;

// Country codes
// Grabbing these from: https://github.com/OpenBookPrices/country-data
wca.countryISO2Codes = _.map(countries, function(data, key) { return data.alpha2; });
wca.countryISO2AutoformOptions = _.map(countries, function(data, key) { return {label: data.name, value: data.alpha2 }; });
