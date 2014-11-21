Competitions = new Meteor.Collection("competitions");
Competitions.attachSchema({
  competitionName: {
    type: String,
    label: "Competition name",
  },
  wcaCompetitionId: {
    type: String,
    label: "WCA competition id",
    unique: true,
    optional: true,
  },
  listed: {
    type: Boolean,
    label: "Listed",
  },
  calendarStartMinutes: {
    type: Number,
    min: 0,
    max: 24*60,
    defaultValue: 0,
  },
  calendarEndMinutes: {
    type: Number,
    min: 0,
    max: 24*60,
    defaultValue: 24*60,
  },
  startDate: {
    type: Date,
  },
  numberOfDays: {
    type: Number,
    min: 1,
    defaultValue: 1,
  },

  // I'm not wild about the fact that competitors is an array of objects
  // containing ids, but staff and organizers is an array of ids.
  competitors: {
    type: [Object],
    defaultValue: [],
  },
  "competitors.$._id": {
    type: String,
  },
  staff: {
    type: [String],
    defaultValue: [],
  },
  organizers: {
    type: [String],
  },
});

// The name "Round" is a bit misleading here, as we use Rounds to store
// stuff like "Lunch" and "Registration" in addition to rounds with WCA events.
// It's basically anything that would show up in the schedule.
Rounds = new Meteor.Collection("rounds");
Rounds.attachSchema({
  competitionId: {
    type: String,
  },

  nthDay: {
    type: Number,
    min: 0,
    // should be <= numberOfDays in the corresponding Competition
    optional: true,
  },

  startMinutes: {
    // The time at which the round starts (stored as an offset from midnight in
    // minutes assuming no leap time or DST or anything. This means that 60*1.5
    // (1:30 AM) is sometimes ambiguous because sometimes there are multiple
    // 1:30 AMs in a given day.
    type: Number,
    min: 0,
    max: 24*60,
    optional: true,
  },
  durationMinutes: {
    type: Number,
    min: 0,
    defaultValue: 30,
  },

  // *** Attributes for real rounds for WCA events ***
  nthRound: {
    // How many rounds come before this round for this eventCode
    type: Number,
    min: 0,
    optional: true,
  },
  combined: {
    type: Boolean,
    optional: true,
  },
  eventCode: {
    type: String,
    allowedValues: _.keys(wca.eventByCode),
    optional: true,
  },
  roundCode: {
    // A WCA round code (this can be computed from nthRound, combined, and the
    // total number of rounds for this eventCode). For example, round 1/4 is a
    // "(Combined) First Round", but round 1/1 is a "(Combined) Final"
    type: String,
    allowedValues: _.keys(wca.roundByCode),
    optional: true,
  },
  formatCode: {
    type: String,
    allowedValues: _.keys(wca.formatByCode),
    optional: true,
  },
});

// TODO - add indices. do we want a compound index on average, best?
//  https://github.com/aldeed/meteor-collection2/issues/88
Results = new Meteor.Collection("results");
Results.attachSchema({
  competitionId: {
    type: String,
  },
  roundId: {
    type: String,
  },
  userId: {
    type: String,
  },
  position: {
    type: Number,
    min: 0,
  },
  solves: {
    type: [Number],
  },
  best: {
    type: Number,
  },
  average: {
    type: Number,
  },
});

Groups = new Meteor.Collection("groups");
Groups.attachSchema({
  competitionId: {
    type: String,
  },
  roundId: {
    type: String,
  },
  group: {
    type: String,
  },
  scrambles: {
    type: [String],
  },
  extraScrambles: {
    type: [String],
  },
  scrambleProgram: {
    type: String,
  },
});

var getDocumentAttribute = function(Collection, id, attribute) {
  var fields = {};
  fields[attribute] = 1;
  var doc = Collection.findOne({
    _id: id
  }, {
    fields: fields
  });
  attribute.split(".").forEach(function(attr) {
    doc = doc[attr];
  });
  return doc;
};

getCompetitionAttribute = function(competitionId, attribute) {
  return getDocumentAttribute(Competitions, competitionId, attribute);
};

getUserAttribute = function(userId, attribute) {
  return getDocumentAttribute(Meteor.users, userId, attribute);
};

getRoundAttribute = function(roundId, attribute) {
  return getDocumentAttribute(Rounds, roundId, attribute);
};
