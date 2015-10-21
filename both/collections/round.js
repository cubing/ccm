const log = logging.handle("round");

// Add functions to the Mongo object, using transform (see http://docs.meteor.com/#/full/mongo_collection)
Round = function(doc) {
  _.extend(this, doc);
};

_.extend(Round.prototype, {
  prettyStringNoFormat: function() {
    return this.prettyString({showFormat: false});
  },
  prettyString: function({showEventName=true, showName=true, showFormat=true}={}) { // jshint ignore:line
    let str = "";
    if(showEventName) {
      str += this.eventName();
    }
    if(showName) {
      if(str.length > 0) {
        str += ": ";
      }
      str += this.properties().name;
    }
    if(showFormat) {
      if(str.length > 0) {
        str += " ";
      }
      str += this.format().name;
    }
    return str;
  },
  displayTitle: function() {
    let words = (this.totalRounds == 1) ? "Final Round" : `Round ${this.nthRound} of ${this.totalRounds}`;
    return `${this.eventName()}: ${words}`;
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
      throw new Error(`Unknown format sortBy '${sortBy}'`);
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
  endMinutes: function() {
    return this.startMinutes + this.durationMinutes;
  },
  isScheduled: function() {
    let scheduledEvent = ScheduleEvents.findOne({roundId: this._id});
    return !!scheduledEvent;
  },
  groups: function() {
    return Groups.find({roundId: this._id}, { sort: { group: 1 }});
  },
  sortResults: function() {
    let results = Results.find({ roundId: this._id }, { sort: this.resultSortOrder() }).fetch();
    let position = 0;
    let doneSolves = 0;
    let totalSolves = 0;
    results.forEach((result, i) => {
      let tied = false;
      let previousResult = results[i - 1];
      if(previousResult) {
        let tiedBest = wca.compareSolveTimes(result.solves[result.bestIndex], previousResult.solves[previousResult.bestIndex]) === 0;
        switch(this.format().sortBy) {
        case "best":
          tied = tiedBest;
          break;
        case "average":
          let tiedAverage = wca.compareSolveTimes(result.average, previousResult.average) === 0;
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
      result.solves.forEach(solve => {
        if(solve) {
          doneSolves++;
        }
      });

      log.l3("Setting resultId", result._id, "to position", position);
      Results.update(result._id, {
        $set: {
          position: result.sortableBestValue == wca.MAX_INT && result.sortableAverageValue == wca.MAX_INT ? null : position,
        }
      });
    });

    let newRoundSize = _.select(results, result => !result.noShow).length;
    Rounds.update(this._id, { $set: { size: newRoundSize } });

    // Normalize done and total to the number of participants
    let total = newRoundSize;
    let done = (totalSolves === 0 ? 0 : (doneSolves / totalSolves) * total);

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
          let eventCodeField = this.field("eventCode");
          if(eventCodeField.isSet) {
            let eventCode = eventCodeField.value;
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
