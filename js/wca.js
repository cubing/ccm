wca = {
  roundCodes: {
  } 
};

function createRoundType(displayName, id, roundType, combined) {
  var roundType = {
    displayName: displayName,
    id: id,
    roundType: roundType,
    combined: combined
  };
  wca.roundCodes[id] = roundType;
  return roundType;
}

COMBINED_QUALIFICATION = createRoundType("Combined qualification", "h", 0, true);
QUALIFICATION_ROUND = createRoundType("Qualification round", "0", 0, false);
COMBINED_FIRST_ROUND = createRoundType("Combined First round", "d", 1, true);
FIRST_ROUND = createRoundType("First round", "1", 1, false);
B_FINAL = createRoundType("B Final", "b", 2, false);
SECOND_ROUND = createRoundType("Second round", "2", 3, false);
COMBINED_SECOND_ROUND = createRoundType("Combined Second round", "e", 3, true);
COMBINED_THIRD_ROUND = createRoundType("Combined Third Round", "g", 4, true);
SEMI_FINAL = createRoundType("Semi Final", "3", 5, false);
COMBINED_FINAL = createRoundType("Combined Final", "c", 6, true);
FINAL = createRoundType("Final", "f", 6, false);

UI.registerHelper("roundName", function(id) {
  return wca.roundCodes[id].displayName;
});

UI.registerHelper("eventName", function(eventCode) {
  return wca.eventById[eventCode].name;
});


wca.events = [
  {
    id:"333",
    name:"Rubik's Cube"
  },
  {
    id:"444",
    name:"4x4 Cube"
  },
  {
    id:"555",
    name:"5x5 Cube"
  },
  {
    id:"222",
    name:"2x2 Cube"
  },
  {
    id:"333bf",
    name:"Rubik's Cube: Blindfolded"
  },
  {
    id:"333oh",
    name:"Rubik's Cube: One-handed"
  },
  {
    id:"333fm",
    name:"Rubik's Cube: Fewest moves"
  },
  {
    id:"333ft",
    name:"Rubik's Cube: With feet"
  },
  {
    id:"minx",
    name:"Megaminx"
  },
  {
    id:"pyram",
    name:"Pyraminx"
  },
  {
    id:"sq1",
    name:"Square-1"
  },
  {
    id:"clock",
    name:"Rubik's Clock"
  },
  {
    id:"skewb",
    name:"Skewb"
  },
  {
    id:"666",
    name:"6x6 Cube"
  },
  {
    id:"777",
    name:"7x7 Cube"
  },
  {
    id:"444bf",
    name:"4x4 Cube: Blindfolded"
  },
  {
    id:"555bf",
    name:"4x4 Cube: Blindfolded" 
  },
  {
    id:"333mbf",
    name:"Rubik's Cube: Multiple Blindfolded"
  }
];


wca.eventById={};

_.forEach(wca.events,function(e,i){
  e.index = i;
  wca.eventById[e.id]=e;
});
