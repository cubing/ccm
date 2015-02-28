
// Add functions to the Mongo object, using transform (see http://docs.meteor.com/#/full/mongo_collection)
Round = function(doc) {
  _.extend(this, doc);
};
_.extend(Round.prototype, {

  format: function() {
    return wca.formatByCode[this.formatCode];
  },
  properties: function() {
    return wca.roundByCode[this.roundCode];
  },
  eventName: function() {
    return this.eventCode ? wca.eventByCode[this.eventCode].name : '';
  },
  eventSolveTimeFields: function() {
    return this.eventCode ? wca.eventByCode[this.eventCode].solveTimeFields : undefined;
  },
  isUnstarted: function() {
    return this.status === wca.roundStatuses.unstarted;
  },
  isOpen: function() {
    return this.status === wca.roundStatuses.open;
  },
  isClosed: function() {
    return this.status === wca.roundStatuses.closed;
  },
});



MIN_ROUND_DURATION_MINUTES = 30;
DEFAULT_ROUND_DURATION_MINUTES = 60;
DEFAULT_ROUND_NTHDAY = 0;
// The name "Round" is a bit misleading here, as we use Rounds to store
// stuff like "Lunch" and "Registration" in addition to rounds with WCA events.
// It's basically anything that would show up in the schedule.
Rounds = new Mongo.Collection("rounds", { transform: function(doc) { return new Round(doc); } });

Rounds.attachSchema({
  competitionId: {
    type: String,
  },

  nthDay: {
    type: Number,
    min: 0,
    // should be <= numberOfDays in the corresponding Competition
    defaultValue: DEFAULT_ROUND_NTHDAY,
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
    min: MIN_ROUND_DURATION_MINUTES,
    defaultValue: DEFAULT_ROUND_DURATION_MINUTES,
  },

  title: {
    // This is only used by rounds that do *not* correspond to WCA events.
    type: String,
    optional: true,
  },

  // *** Attributes for real rounds for WCA events ***
  nthRound: {
    // Indexed from 1, because humans will see this in urls
    type: Number,
    min: 1,
    optional: true,
  },
  size: {
    // How many participants we expect to allow into this round.
    // Based on attendance and time, more or fewer people may end up competing
    // in this round.
    type: Number,
    min: 0,
    optional: true,
  },
  softCutoff: {
    type: new SimpleSchema({
      time: {
        type: SolveTime,
      },
      formatCode: {
        type: String,
        allowedValues: _.keys(wca.softCutoffFormatByCode),
      }
    }),
    optional: true,
  },
  hardCutoff: {
    type: new SimpleSchema({
      time: {
        // This is the time limit per solve. Anything over the hard cutoff is a
        // DNF.
        type: SolveTime,
        autoValue: function() {
          if(this.isSet) {
            // If time is already set, don't overwrite it with the default.
            return;
          }
          var eventCodeField = this.field("eventCode");
          if(eventCodeField.isSet) {
            var eventCode = eventCodeField.value;
            if(wca.eventAllowsCutoffs(eventCode)) {
              return {
                millis: 1000*wca.DEFAULT_HARD_CUTOFF_SECONDS_BY_EVENTCODE[eventCode],
                decimals: 0,
              };
            }
          }
          this.unset();
        },
      }
    }),
    optional: true,
  },
  eventCode: {
    type: String,
    allowedValues: _.keys(wca.eventByCode),
    optional: true,
  },
  roundCode: {
    // A WCA round code (this can be computed from nthRound, softCutoff, and
    // the total number of rounds for this eventCode). For example, round 1/4
    // is a "(Combined) First Round", but round 1/1 is a "(Combined) Final".
    type: String,
    allowedValues: _.keys(wca.roundByCode),
    optional: true,
  },
  formatCode: {
    type: String,
    allowedValues: _.keys(wca.formatByCode),
    optional: true,
  },
  status: {
    type: String,
    allowedValues: _.keys(wca.roundStatuses),
    defaultValue: wca.roundStatuses.unstarted,
    optional: true,
  },
  progress: {
    type: new SimpleSchema({
      done: {
        type: Number,
        // done is meant to give a sense of how many people are done, and
        // people can be partway done.
        decimal: true,
        min: 0,
      },
      total: {
        type: Number,
        min: 0,
      },
    }),
    optional: true,
  },
});

if(Meteor.isServer) {
  Rounds._ensureIndex({
    competitionId: 1,
  });
}
