wca = {};

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

wca.maxRoundsPerEvent = wca.supportedRounds.length;

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

wca.formatByCode = {
  "1": {
    "name": "Best of 1",
    "count": 1,
    "code": "1"
  },
  "2": {
    "name": "Best of 2",
    "count": 2,
    "code": "2"
  },
  "3": {
    "name": "Best of 3",
    "count": 3,
    "code": "3"
  },
  "a": {
    "name": "Average of 5",
    "count": 5,
    "code": "a"
  },
  "m": {
    "name": "Mean of 3",
    "count": 3,
    "code": "m"
  },
};

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
