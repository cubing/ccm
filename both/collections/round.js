var log = logging.handle("round");

// Add functions to the Mongo object, using transform (see http://docs.meteor.com/#/full/mongo_collection)
Round = function(doc) {
  _.extend(this, doc);
};

_.extend(Round.prototype, {
  prettyStringNoFormat: function() {
    return this.prettyString(false);
  },
  prettyString: function(showFormat=true) {
    var str = wca.eventByCode[this.eventCode].name;
    str += ": " + wca.roundByCode[this.roundCode()].name;
    if(showFormat) {
      str += " " + wca.formatByCode[this.formatCode].name;
    }
    return str;
  },
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
    return wca.roundByCode[this.roundCode()];
  },
  eventName: function() {
    assert(this.eventCode);
    return wca.eventByCode[this.eventCode].name;
  },
  eventSolveTimeFields: function() {
    assert(this.eventCode);
    return wca.eventByCode[this.eventCode].solveTimeFields;
  },
  roundCode: function() {
    if(this.isLast()) {
      return this.softCutoff ? 'c' : 'f';
    } else {
      return (this.softCutoff ? 'degc' : '123f')[this.nthRound-1];
    }
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
  isLast: function() {
    return this.nthRound === this.totalRounds;
  },
  displayTitle: function() {
    var words = (this.totalRounds == 1) ? "Single Round" : "Round " + this.nthRound + " of " + this.totalRounds;
    return this.eventName() + ": " + words;
  },
  endMinutes: function() {
    return this.startMinutes + this.durationMinutes;
  },
  isScheduled: function() {
    var scheduledEvent = ScheduleEvents.findOne({roundId: this._id});
    return !!scheduledEvent;
  },
  groups: function() {
    return Groups.find({roundId: this._id}, { sort: { group: 1 }});
  },
  sortResults: function() {
    var that = this;
    var results = Results.find({ roundId: this._id }, { sort: this.resultSortOrder() }).fetch();
    var position = 0;
    var doneSolves = 0;
    var totalSolves = 0;
    results.forEach(function(result, i) {
      var tied = false;
      var previousResult = results[i - 1];
      if(previousResult) {
        var tiedBest = wca.compareSolveTimes(result.solves[result.bestIndex], previousResult.solves[previousResult.bestIndex]) === 0;
        switch(that.format().sortBy) {
        case "best":
          tied = tiedBest;
          break;
        case "average":
          var tiedAverage = wca.compareSolveTimes(result.average, previousResult.average) === 0;
          tied = tiedAverage && tiedBest;
          break;
        default:
          // uh-oh, unrecognized roundFormat, give up
          assert(false);
        }
      }
      if(!tied) {
        position++;
      }

      totalSolves += result.getExpectedSolveCount();
      result.solves.forEach(function(solve) {
        if(solve) {
          doneSolves++;
        }
      });

      log.l3("Setting resultId", result._id, "to position", position);
      Results.update(result._id, { $set: { position: result.sortableBestValue == wca.MAX_INT && result.sortableAverageValue == wca.MAX_INT ? null : position } });
    });

    let newRoundSize = _.select(results, result => !result.noShow).length;
    Rounds.update(this._id, { $set: { size: newRoundSize } });

    // Normalize done and total to the number of participants
    var total = newRoundSize;
    var done = (totalSolves === 0 ? 0 : (doneSolves / totalSolves) * total);

    log.l2(this._id, " updating progress - done: " + done + ", total: " + total);
    RoundProgresses.update({ roundId: this._id }, { $set: { done: done, total: total }});
  },
  getPreviousRound: function() {
    return Rounds.findOne({
      competitionId: this.competitionId,
      eventCode: this.eventCode,
      nthRound: this.nthRound - 1,
    });
  },
  getNextRound: function() {
    return Rounds.findOne({
      competitionId: this.competitionId,
      eventCode: this.eventCode,
      nthRound: this.nthRound + 1,
    });
  },
  getMaxAllowedToAdvanceCount: function() {
    if(!this.size) {
      return null;
    }
    return Math.floor(this.size*(1 - wca.MINIMUM_CUTOFF_PERCENTAGE/100.0));
  },
  getMaxAllowedSize: function() {
    let previousRound = this.getPreviousRound();
    if(!previousRound) {
      return null;
    }
    return previousRound.getMaxAllowedToAdvanceCount();
  },
  getAlerts: function() {
    let alerts = [];
    if(this.isClosed()) {
      alerts.push({
        severity: "warning",
        message: "You're entering times for a closed round. This could create inconsistencies in the set of people who advanced to the next round.",
      });
    }
    if(this.isUnstarted()) {
      alerts.push({
        severity: "warning",
        message: "You're entering times for a round that has not yet started.",
      });
    }
    let maxAllowed = this.getMaxAllowedSize();
    if(maxAllowed !== null && this.size > maxAllowed) {
      alerts.push({
        severity: "danger",
        message: `According to <a href='https://www.worldcubeassociation.org/regulations/#9p1' target='_blank' rel='external'>9p1</a>, this round should not have more than ${maxAllowed} people in it.`,
      });
    }
    return alerts;
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
  },
  totalRounds: {
    type: Number,
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
  formatCode: { // TODO Replace with function() {return wca.formatsByEventCode[this.eventCode][0]}
    type: String,
    allowedValues: _.keys(wca.formatByCode),
  },
  status: {
    type: String,
    allowedValues: _.keys(wca.roundStatuses),
    defaultValue: wca.roundStatuses.unstarted,
  },
});

if(Meteor.isServer) {
  Rounds._ensureIndex({
    competitionId: 1,
  });
}
