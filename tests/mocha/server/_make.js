// Factories to create valid customizable sample objects in the DB

let uniqueNumber = 0;
function presets(propertyKey) {
  switch(propertyKey) {
    case Rounds:
      return { competitionId: 'fake', nthRound: 1, totalRounds: 1, formatCode: 'a', eventCode: '333' };

    case 'softCutoff':
      return { softCutoff: { time: {}, formatCode: '2'} };

    case RoundProgresses:
      return { roundId: 'Fake', competitionId: 'fake'};

    case Competitions:
      return { competitionName: "Comp One", numberOfDays: 2, calendarStartMinutes: 600, calendarEndMinutes: 1200, listed: false, startDate: new Date() };

    case ScheduleEvents:
      return { competitionId: 'fake', roundId: null, title: "whatevs", startMinutes: 900, durationMinutes: 30 };

    case Results:
      return {};

    case Registrations:
      return { uniqueName: "Jane" + (uniqueNumber++), countryId: "US", gender: "m", dob: new Date() };

    case Groups:
      return { competitionId: 'fake', group: "A" + (uniqueNumber++), scrambles: [ "R U2 R'" ], extraScrambles: [ "F U2" ], scrambleProgram: "TNoodle 42" };

    case Meteor.users:
      return { emails: [], createdAt: new Date() };

    default:
      throw new Error("Unknown property key: " + propertyKey);
  }
}

// Call format:
//   make(collection, [0 or more variants], [optional override object])
make = function(collection, otherArgs) {
  let lastArg = arguments[arguments.length - 1];
  let hasOverrides = _.isObject(lastArg) && arguments.length > 1;

  let properties = {};
  for(let i = 0; i < arguments.length - (hasOverrides ? 1 : 0); i++) {
    _.extend(properties, presets(arguments[i]));
  }
  return collection.findOne(collection.insert(_.extend(properties, hasOverrides ? lastArg : {})));
};
