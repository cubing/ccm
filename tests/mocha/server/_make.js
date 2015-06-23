// Factories to create valid customizable sample objects in the DB

function presets(propertyKey) {
  switch(propertyKey) {
    case Rounds:
      return { competitionId: 'fake', nthRound: 1, totalRounds: 1 };
    case 'softCutoff':
      return { softCutoff: { time: {}, formatCode: '2'} };

    case RoundProgresses:
      return { roundId: 'Fake', competitionId: 'fake'};

    case Competitions:
      return { competitionName: "Comp One", numberOfDays: 2, calendarStartMinutes: 600, calendarEndMinutes: 1200, listed: false, startDate: new Date() };

    case ScheduleEvents:
      return { competitionId: 'fake', roundId: null, title: "whatevs", startMinutes: 900, durationMinutes: 30 };
  }

  throw new Error("Unknown property key: " + propertyKey);
}

// Call format:
//   make(collection, [0 or more variants], [optional override object])
make = function(collection, otherArgs) {
  var lastArg  = arguments[arguments.length - 1];
  var hasOverrides = _.isObject(lastArg) && arguments.length > 1;

  var properties = {};
  for(var i = 0; i < arguments.length - (hasOverrides ? 1 : 0); i++) {
    _.extend(properties, presets(arguments[i]));
  }
  return collection.findOne(collection.insert(_.extend(properties, hasOverrides ? lastArg : {})));
};
