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

wca.DNF_VALUE = -1;
wca.DNS_VALUE = -2;

var DNF_SOLVE_TIME = {
  puzzlesSolvedCount: 0,
  puzzlesAttemptedCount: 1,
};

var DNS_SOLVE_TIME = {
  puzzlesSolvedCount: 0,
  puzzlesAttemptedCount: 0,
};

function isMBFSolveTime(solveTime) {
  if(solveTime.puzzlesAttemptedCount && solveTime.puzzlesAttemptedCount > 1) {
    assert(solveTime.puzzlesAttemptedCount >= solveTime.puzzlesSolvedCount);
    return true;
  } else {
    return false;
  }
}

wca.solveTimeToWcaValue = function(solveTime) {
  if(!solveTime) {
    // A wcaValue of 0 means "nothing happened here"
    return 0;
  }
  if($.solveTimeIsDNF(solveTime)) {
    return wca.DNF_VALUE;
  }
  if($.solveTimeIsDNS(solveTime)) {
    return wca.DNS_VALUE;
  }
  if(solveTime.moveCount) {
    // If moveCount is set, assume we're dealing with an FMC solve.
    return solveTime.moveCount;
  } else if(isMBFSolveTime(solveTime)) {
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

wca.compareSolveTimes = function(s1, s2) {
  var s1Infinite = $.solveTimeIsDNF(s1) || $.solveTimeIsDNS(s1);
  var s2Infinite = $.solveTimeIsDNF(s2) || $.solveTimeIsDNS(s2);
  if(s1Infinite && s2Infinite) {
    return 0;
  }
  if(s1Infinite) {
    return 1;
  }
  if(s2Infinite) {
    return -1;
  }

  // Verify that these are both timed solves, or both FMC solves
  if(s1.millis) {
    assert(!s1.moveCount);
    assert(s2.millis);
    assert(!s2.moveCount);
  } else {
    assert(s1.moveCount);
    assert(!s1.millis);
    assert(s2.moveCount);
  }

  if(s1.moveCount) {
    // If moveCount is set, assume we're dealing with an FMC solve.
    return s1.moveCount - s2.moveCount;
  } else if(isMBFSolveTime(s1)) {
    assert(isMBFSolveTime(s2));
    // For Multiple Blindfolded Solving, rankings are assessed based on number
    // of puzzles solved minus the number of puzzles not solved, where a
    // greater difference is better. If the difference is less than 0, or if
    // only 1 puzzle is solved, the attempt is considered unsolved (DNF). If
    // competitors achieve the same result, rankings are assessed based on
    // total time, where the shorter recorded time is better. If competitors
    // achieve the same result and the same time, rankings are assessed based
    // on the number of puzzles the competitors failed to solve, where fewer
    // unsolved puzzles is better.
    //  https://www.worldcubeassociation.org/regulations/#9f12c
    var s1_unsolved = s1.puzzlesAttemptedCount - s1.puzzlesSolvedCount;
    var s2_unsolved = s2.puzzlesAttemptedCount - s2.puzzlesSolvedCount;
    var score1 = s1.puzzlesSolvedCount - s1_unsolved;
    var score2 = s2.puzzlesSolvedCount - s2_unsolved;
    if(score1 > score2) {
      // "greater difference is better"
      return -1;
    } else if(s1.millis < s2.millis) {
      // "shorter recorded time is better"
      return -1;
    } else if(s1_unsolved < s2_unsolved) {
      // "fewer unsolved puzzles is better"
      return -1;
    } else {
      // Everything else was equal, so the SolveTimes must be equal.
      return 0;
    }
  } else {
    // Otherwise, it must be a regular solve.
    return s1.millis - s2.millis;
  }
};

wca.maxSolveTime = function(s1, s2) {
  return wca.compareSolveTimes(s1, s2) > 0 ? s1 : s2;
};

wca.minSolveTime = function(s1, s2) {
  return wca.compareSolveTimes(s1, s2) < 0 ? s1 : s2;
};

wca.wcaValueToSolveTime = function(wcaValue, eventId) {
  if(wcaValue === 0) {
    // A wcaValue of 0 means "nothing happened here"
    return null;
  }
  if(wcaValue == wca.DNF_VALUE) {
    return DNF_SOLVE_TIME;
  }
  if(wcaValue == wca.DNS_VALUE) {
    return DNS_SOLVE_TIME;
  }

  if(eventId == '333fm') {
    var moveCount = wcaValue;
    return {
      moveCount: moveCount,
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
    };
  } else {
    var centiseconds = wcaValue;
    return {
      millis: centiseconds*10,
      decimals: 2,
    };
  }
};

wca.solveTimeSorter = function(s1, s2) {
  if(s1 && !s1.wcaValue) {
    s1 = null;
  }
  if(s2 && !s2.wcaValue) {
    s2 = null;
  }

  // Note that we sort so that missing/empty data are last.
  if(!s1 && !s2) {
    return 0;
  } else if(!s1) {
    return 1;
  } else if(!s2) {
    return -1;
  }

  var dns1 = $.solveTimeIsDNS(s1);
  var dns2 = $.solveTimeIsDNS(s2);
  if(dns1 && dns2) {
    return 0;
  } else if(dns1) {
    return 1;
  } else if(dns2) {
    return -1;
  }

  var dnf1 = $.solveTimeIsDNF(s1);
  var dnf2 = $.solveTimeIsDNF(s2);
  if(dnf1 && dnf2) {
    return 0;
  } else if(dnf1) {
    return 1;
  } else if(dnf2) {
    return -1;
  }

  return s1.wcaValue - s2.wcaValue;
};

function solveTimePerfectOrderedHash(solveTime) {
  var MAX_INT = Math.pow(2, 32) - 1;
  if(!solveTime) {
    return MAX_INT;
  }

  var wcaValue = wca.solveTimeToWcaValue(solveTime);
  // wcaValue has almost the sorting properties we need, except for the fact
  // that DNFs and DNSs are negative values, when we really want them to be
  // treated as impossibly large positive values
  if(wcaValue == wca.DNF_VALUE) {
    return MAX_INT;
  }
  if(wcaValue == wca.DNS_VALUE) {
    return MAX_INT;
  }
  return wcaValue;
}

wca.computeSolvesStatistics = function(solves, roundFormatCode) {
  var roundFormat = wca.formatByCode[roundFormatCode];

  var isTimed = null;
  var bestSolve, bestIndex;
  var worstSolve, worstIndex;
  solves.forEach(function(solve, i) {
    if(!solve) {
      return;
    }
    if(!$.solveTimeIsDNF(solve) && !$.solveTimeIsDNS(solve)) {
      if(isTimed === null) {
        // We do not yet know if these solves are supposed to be timed
        // or FMC. This is the first non-DNF solve, so use it as our
        // standard.
        isTimed = !!solve.millis;
      } else {
        if(isTimed) {
          assert(solve.millis);
          assert(!solve.moveCount);
        } else {
          assert(!solve.millis);
          assert(solve.moveCount);
        }
      }
    }
    if(!bestSolve || wca.compareSolveTimes(solve, bestSolve) < 0) {
      bestIndex = i;
      bestSolve = solve;
    }
    if(!worstSolve || wca.compareSolveTimes(solve, worstSolve) >= 0) {
      worstIndex = i;
      worstSolve = solve;
    }
  });

  var completedAverage = false;
  if(roundFormat.computeAverage) {
    var solveCount = 0;
    solves.forEach(function(solve) {
      if(solve) {
        solveCount++;
      }
    });
    completedAverage = ( solveCount == roundFormat.count );
  }

  var averageSolveTime;
  if(completedAverage) {
    var sum = 0;
    var sumSolveCount = 0;
    var countingSolvesCount = 0;
    solves.forEach(function(solve, i) {
      var value;
      if($.solveTimeIsDNF(solve) || $.solveTimeIsDNS(solve)) {
        value = Infinity;
      } else {
        value = isTimed ? solve.millis : solve.moveCount;
      }
      var excluded = roundFormat.trimBestAndWorst && (i == bestIndex || i == worstIndex);
      if(!excluded) {
        sum += value;
        countingSolvesCount++;
      }
    });

    if(sum == Infinity) {
      // DNF average =(
      averageSolveTime = {
        puzzlesSolvedCount: 0,
        puzzlesAttemptedCount: 1,
      };
    } else {
      // All timed results, averages, and means over 10 minutes are measured and
      // rounded to the nearest second (e.g. x.4 becomes x, x.5 becomes x+1).
      //  https://www.worldcubeassociation.org/regulations/#9f2
      var average = Math.round(sum / countingSolvesCount);
      if(isTimed) {
        averageSolveTime = {
          millis: average,
          decimals: 2,
        };
      } else {
        // The average field for FMC is bizarre:
        // it's the average times 100 rounded to the nearest integer.
        averageSolveTime = {
          moveCount: Math.round(100 * average)
        };
      }
    }
  } else {
    averageSolveTime = null;
  }

  var sortableBestValue = solveTimePerfectOrderedHash(bestSolve);
  var sortableAverageValue = solveTimePerfectOrderedHash(averageSolveTime);

  return {
    bestIndex: bestIndex,
    sortableBestValue: sortableBestValue,
    worstIndex: worstIndex,
    average: averageSolveTime,
    sortableAverageValue: sortableAverageValue,
  };
};

wca.penalties = {};
[
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
].forEach(function(penaltyName) {
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
wca.softCutoffFormats.forEach(function(softCutoffFormat) {
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
    //"name": "Final",
    "name": "Final round",
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
wca.events.forEach(function(event) {
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
    "computeAverage": true,
    "trimBestAndWorst": false,
    "averageName": "Mean",
    "sortBy": "best",
  },
  {
    "name": "Average of 5",
    "shortName": "Ao5",
    "count": 5,
    "code": "a",
    "softCutoffFormatCodes": [ 'cumulative', '1', '2', '3' ],

    "computeAverage": true,
    "trimBestAndWorst": true,
    "averageName": "Average",
    "sortBy": "average",
  },
  {
    "name": "Mean of 3",
    "shortName": "Mo3",
    "count": 3,
    "code": "m",
    "softCutoffFormatCodes": [ 'cumulative', '1', '2' ],

    "computeAverage": true,
    "trimBestAndWorst": false,
    "averageName": "Mean",
    "sortBy": "average",
  },
];

wca.formatByCode = {};
wca.formats.forEach(function(format) {
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
Object.keys(wca.formatsByEventCode).forEach(function(eventCode) {
  wca.DEFAULT_HARD_CUTOFF_SECONDS_BY_EVENTCODE[eventCode] = 10*60;
});
wca.DEFAULT_HARD_CUTOFF_SECONDS_BY_EVENTCODE['444bf'] = 60*60;
wca.DEFAULT_HARD_CUTOFF_SECONDS_BY_EVENTCODE['555bf'] = 60*60;
wca.DEFAULT_HARD_CUTOFF_SECONDS_BY_EVENTCODE['333mbf'] = 60*60;

// Country codes
// Grabbing these from: https://github.com/OpenBookPrices/country-data
if(typeof(countries) === "undefined") {
  // Dirty hack to let us unit test this file without loading country data.
  countries = [];
}
wca.countryISO2Codes = countries.map(function(data, key) { return data.alpha2; });
wca.countryISO2AutoformOptions = countries.map(function(data, key) { return {label: data.name, value: data.alpha2 }; });

wca.genders = [
  {
    value: 'm',
    label: 'Male',
  },
  {
    value: 'f',
    label: 'Female',
  },
  {
    value: 'o',
    label: 'Other',
  },
];

wca.genderByValue = {};
wca.genders.forEach(function(gender) {
  wca.genderByValue[gender.value] = gender;
});
