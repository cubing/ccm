const log = logging.handle("round");

// Add functions to the Mongo object, using transform (see http://docs.meteor.com/#/full/mongo_collection)
Round = function(doc) {
  _.extend(this, doc);
};

_.extend(Round.prototype, {
  prettyStringNoFormat() {
    return this.prettyString({showFormat: false});
  },

  prettyString({showEventName=true, showName=true, showFormat=true}={}) { // jshint ignore:line
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

  displayTitle() {
    let words = (this.totalRounds == 1) ? "Final Round" : `Round ${this.nthRound} of ${this.totalRounds}`;
    return `${this.eventName()}: ${words}`;
  },

  format() {
    return wca.formatByCode[this.formatCode];
  },

  resultSortOrder() {
    switch(this.format().sortBy) {
    case "best":
      return {sortableBestValue: 1};
    case "average":
      return {sortableAverageValue: 1, sortableBestValue: 1};
    default:
      throw new Error(`Unknown format sortBy '${sortBy}'`);
    }
  },

  properties() {
    return wca.roundByCode[this.roundCode()];
  },

  eventName() {
    assert(this.eventCode);
    return wca.eventByCode[this.eventCode].name;
  },

  eventSolveTimeFields() {
    assert(this.eventCode);
    return wca.eventByCode[this.eventCode].solveTimeFields;
  },

  roundCode() {
    if(this.isLast()) {
      return this.softCutoff ? 'c' : 'f';
    } else {
      return (this.softCutoff ? 'degc' : '123f')[this.nthRound-1];
    }
  },

  isUnstarted() {
    return this.status === wca.roundStatuses.unstarted;
  },
  isOpen() {
    return this.status === wca.roundStatuses.open;
  },
  isClosed() {
    return this.status === wca.roundStatuses.closed;
  },
  isLast() {
    return this.nthRound === this.totalRounds;
  },

  endMinutes() {
    return this.startMinutes + this.durationMinutes;
  },

  isScheduled() {
    let scheduledEvent = ScheduleEvents.findOne({roundId: this._id});
    return !!scheduledEvent;
  },

  groups() {
    return Groups.find({roundId: this._id}, { sort: { group: 1 }});
  },

  sortResults() {
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
        position = i + 1;
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

    let newRoundSize = _.select(results, result => !result.noShow && result.registration().checkedIn).length;
    Rounds.update(this._id, { $set: { size: newRoundSize } });

    // Normalize done and total to the number of participants
    let total = newRoundSize;
    let done = (totalSolves === 0 ? 0 : (doneSolves / totalSolves) * total);

    log.l2(this._id, "updating progress - done:", done, "total:", total);
    RoundProgresses.update({ roundId: this._id }, { $set: { done: done, total: total }});
  },

  getPreviousRound() {
    return Rounds.findOne({
      competitionId: this.competitionId,
      eventCode: this.eventCode,
      nthRound: this.nthRound - 1,
    });
  },

  getNextRound() {
    return Rounds.findOne({
      competitionId: this.competitionId,
      eventCode: this.eventCode,
      nthRound: this.nthRound + 1,
    });
  },

  getMaxAllowedToAdvanceCount() {
    if(!this.size) {
      return null;
    }
    return Math.floor(this.size*(1 - wca.MINIMUM_CUTOFF_PERCENTAGE/100.0));
  },

  getMaxAllowedSize() {
    let previousRound = this.getPreviousRound();
    if(!previousRound) {
      return null;
    }
    return previousRound.getMaxAllowedToAdvanceCount();
  },

  getAlerts() {
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

  getResultsWithRegistrations({limit=undefined, sorted=false}={}) { // jshint ignore:line
    // Join each Result with its Registration and Round.
    let registrations = Registrations.find({
      competitionId: this.competitionId,
      registeredEvents: this.eventCode,
    });
    let registrationById = {};
    registrations.forEach(registration => {
      registrationById[registration._id] = registration;
    });

    let results = Results.find({ roundId: this._id }, { limit: limit }).fetch();
    results.forEach(result => {
      result.registration = registrationById[result.registrationId] || {};
      result.round = this;
    });

    if(sorted) {
      // Asking meteor to sort is slower than just fetching and doing
      // it ourselves. So here we go.
      results.sort(function(a, b) {
        // position may be undefined if no times have been entered yet.
        // We intentionally sort so that unentered rows (results without a position)
        // are on the bottom, with noShows even lower than them.
        if(a.noShow && !b.noShow) {
          return 1;
        } else if(!a.noShow && b.noShow) {
          return -1;
        }
        if(!a.position && !b.position) {
          // Both of these results do not have a position yet, so sort them
          // by how they did in the previous round.
          if(!a.previousPosition) {
            return 1;
          }
          if(!b.previousPosition) {
            return -1;
          }
          return a.previousPosition - b.previousPosition;
        }
        if(!a.position) {
          return 1;
        }
        if(!b.position) {
          return -1;
        }
        return a.position - b.position;
      });
    }

    return results;
  },

  recalculate() {
    Results.find({ roundId: this._id }).forEach(result => result.recalculate());
  },

  remove() {
    Rounds.remove(this._id);
    [RoundProgresses, Results, Groups, ScheduleEvents].forEach(collection => {
      collection.remove({ roundId: this._id });
    });

    Rounds.update(
      { competitionId: this.competitionId, eventCode: this.eventCode },
      { $set: { totalRounds: this.totalRounds - 1 } },
      { multi: true }
    );

    // Deleting a round affects the set of people who advanced
    // from the previous round.
    let previousRound = this.getPreviousRound();
    if(previousRound) {
      Meteor.call('recomputeWhoAdvancedAndPreviousPosition', previousRound._id);
    }
  },
});

Rounds = new Mongo.Collection("rounds", { transform: function(doc) { return new Round(doc); } });

Schema.round = new SimpleSchema({
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
  timeLimit: {
    type: new SimpleSchema({
      time: {
        // This is the time limit per solve. Anything over the time limit is a
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
                millis: 1000*wca.DEFAULT_TIME_LIMIT_SECONDS_BY_EVENTCODE[eventCode],
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

Rounds.attachSchema(Schema.round);

if(Meteor.isServer) {
  Rounds._ensureIndex({
    competitionId: 1,
  });
}
