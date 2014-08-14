wca = {
  roundTypes: {
  } 
};

function createRoundType(displayName, id, roundType, combined) {
  var roundType = {
    displayName: displayName,
    id: id,
    roundType: roundType,
    combined: combined
  };
  wca.roundTypes[id] = roundType;
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
  return wca.roundTypes[id].displayName;
});
