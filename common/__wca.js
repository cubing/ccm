wca = {};

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
wca.softCutoffFormatsByCode = {};
_.each(wca.softCutoffFormats, function(softCutoffFormat) {
  wca.softCutoffFormatsByCode[softCutoffFormat.code] = softCutoffFormat;
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

wca.eventByCode = {
  "222": {
    "code": "222",
    "name": "2x2 Cube",
  },
  "333": {
    "code": "333",
    "name": "Rubik's Cube",
  },
  "444": {
    "code": "444",
    "name": "4x4 Cube",
  },
  "555": {
    "code": "555",
    "name": "5x5 Cube",
  },
  "666": {
    "code": "666",
    "name": "6x6 Cube",
  },
  "777": {
    "code": "777",
    "name": "7x7 Cube",
  },
  "333bf": {
    "code": "333bf",
    "name": "Rubik's Cube: Blindfolded",
  },
  "333oh": {
    "code": "333oh",
    "name": "Rubik's Cube: One-handed",
  },
  "333fm": {
    "code": "333fm",
    "name": "Rubik's Cube: Fewest moves",
  },
  "333ft": {
    "code": "333ft",
    "name": "Rubik's Cube: With feet",
  },
  "minx": {
    "code": "minx",
    "name": "Megaminx",
  },
  "pyram": {
    "code": "pyram",
    "name": "Pyraminx",
  },
  "sq1": {
    "code": "sq1",
    "name": "Square-1",
  },
  "clock": {
    "code": "clock",
    "name": "Rubik's Clock",
  },
  "skewb": {
    "code": "skewb",
    "name": "Skewb",
  },
  "444bf": {
    "code": "444bf",
    "name": "4x4 Cube: Blindfolded",
  },
  "555bf": {
    "code": "555bf",
    "name": "4x4 Cube: Blindfolded",
  },
  "333mbf": {
    "code": "333mbf",
    "name": "Rubik's Cube: Multiple Blindfolded",
  },
};

wca.formats = [
  {
    "name": "Best of 1",
    "shortName": "Bo1",
    "count": 1,
    "code": "1",
    "softCutoffFormatCodes": [],
  },
  {
    "name": "Best of 2",
    "shortName": "Bo2",
    "count": 2,
    "code": "2",
    "softCutoffFormatCodes": [ 'cumulative', '1' ],
  },
  {
    "name": "Best of 3",
    "shortName": "Bo3",
    "count": 3,
    "code": "3",
    "softCutoffFormatCodes": [ 'cumulative', '1', '2' ],
  },
  {
    "name": "Average of 5",
    "shortName": "Ao5",
    "count": 5,
    "code": "a",
    "softCutoffFormatCodes": [ 'cumulative', '1', '2', '3' ],
  },
  {
    "name": "Mean of 3",
    "shortName": "Mo3",
    "count": 3,
    "code": "m",
    "softCutoffFormatCodes": [ 'cumulative', '1', '2' ],
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

// https://www.worldcubeassociation.org/regulations/#A1a1
wca.DEFAULT_HARD_CUTOFF_SECONDS_BY_EVENTCODE = {};
_.each(_.keys(wca.formatsByEventCode), function(eventCode) {
  wca.DEFAULT_HARD_CUTOFF_SECONDS_BY_EVENTCODE[eventCode] = 10*60;
});
wca.DEFAULT_HARD_CUTOFF_SECONDS_BY_EVENTCODE['444bf'] = 60*60;
wca.DEFAULT_HARD_CUTOFF_SECONDS_BY_EVENTCODE['555bf'] = 60*60;
wca.DEFAULT_HARD_CUTOFF_SECONDS_BY_EVENTCODE['333mbf'] = 60*60;
