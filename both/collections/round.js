
// Add functions to the Mongo object, using transform (see http://docs.meteor.com/#/full/mongo_collection)
Round = function(doc) {
  _.extend(this, doc);
};

_.extend(Round.prototype, {

  format: function() {
    return wca.formatByCode[this.formatCode];
  },
  resultSortOrder: function() {
    switch(this.format().sortBy) {
    case "best":
      return {sortableBestValue: 1};
    case "average":
      return {sortableAverageValue: 1, sortableBestValue: 1};
    default:
      throw new Error("Unknown format sortBy '" + sortBy + "'");
    }
  },
  properties: function() {
    return wca.roundByCode[this.roundCode];
  },
  eventName: function() {
    assert(this.eventCode);
    return wca.eventByCode[this.eventCode].name;
  },
  eventSolveTimeFields: function() {
    assert(this.eventCode);
    return wca.eventByCode[this.eventCode].solveTimeFields;
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
  displayTitle: function() {
      return this.eventName() + ": " + this.properties().name;
  },
  isScheduled: function() {
    var scheduledEvent = ScheduleEvents.findOne({roundId: this._id});
    return !!scheduledEvent;
  },
  groups: function() {
    return Groups.find({roundId: this._id}, { sort: { group: 1 }});
  },
});

Rounds = new Mongo.Collection("rounds", { transform: function(doc) { return new Round(doc); } });

Rounds.attachSchema({
  competitionId: {
    type: String,
  },

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
});

if(Meteor.isServer) {
  Rounds._ensureIndex({
    competitionId: 1,
  });
}
