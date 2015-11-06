// Add functions to the Mongo object, using transform (see http://docs.meteor.com/#/full/mongo_collection)
let Result = function(doc) {
  _.extend(this, doc);
};

_.extend(Result.prototype, {
  round() {
    return Rounds.findOne(this.roundId);
  },

  registration() {
    return Registrations.findOne(this.registrationId);
  },

  getExpectedSolveCount() {
    if(this.noShow) {
      return 0;
    }
    let round = Rounds.findOne(this.roundId, {
      fields: {
        formatCode: 1,
        softCutoff: 1,
      }
    });
    if(!round.softCutoff) {
      return round.format().count;
    }
    let softCutoffFormat = wca.softCutoffFormatByCode[round.softCutoff.formatCode];
    let expectedSolveCount = softCutoffFormat.getExpectedSolveCount(this.solves, round.softCutoff.time, round.formatCode);
    return expectedSolveCount;
  },

  hasDataEntered() {
    return this.solves && this.solves.filter(s => s).length > 0;
  },

  allSolves() {
    // Sanitize the solves array to contain all current and future solves.
    let expectedSolveCount = this.getExpectedSolveCount();
    let solves = this.solves || [];
    while(solves.length < expectedSolveCount) {
      solves.push(null);
    }
    return solves;
  },

  setSolveTime(solveIndex, solveTime) {
    // If the client didn't send us a timestamp, cons one up here.
    if(solveTime && !solveTime.updatedAt) {
      solveTime.updatedAt = new Date();
    }

    let round = Rounds.findOne(this.roundId);
    if(!round) {
      throw new Meteor.Error(404, "Round not found");
    }

    check(solveIndex, Match.Integer);
    if(solveIndex < 0) {
      throw new Meteor.Error(400, "Cannot have a negative solve index");
    }
    if(solveIndex >= this.solves.length) {
      // If we add this solveTime, we'll be expanding the solves list.
      // We only want to let the user expand the solves list so long as they
      // stay within the round solve limit.
      if(solveIndex >= round.format().count) {
        throw new Meteor.Error(400, `Round ${round._id} does not allow a solve at index ${solveIndex}`);
      }
    }
    this.solves[solveIndex] = solveTime;

    // Trim null solves from the end of the solves array until it fits.
    while(this.solves.length > 0 && !this.solves[this.solves.length - 1]) {
      this.solves.pop();
    }

    let $set = {
      solves: this.solves
    };

    let statistics = wca.computeSolvesStatistics(this.solves, round.formatCode, round.roundCode());
    _.extend($set, statistics);

    Results.update(this._id, { $set: $set });
    RoundSorter.addRoundToSort(this.roundId);
  },
});

Results = new Mongo.Collection("results", {
  transform: function(doc) {
    return new Result(doc);
  },
});

Schema.result = new SimpleSchema({
  competitionId: {
    type: String,
  },
  roundId: {
    type: String,
  },
  registrationId: {
    type: String,
  },
  position: {
    type: Number,
    min: 0,
    optional: true,
  },
  // This person's position in the previous round, if there was one. This
  // lets us sort the unentered results for this round in a sane order.
  previousPosition: {
    type: Number,
    min: 0,
    optional: true,
  },
  noShow: {
    type: Boolean,
    optional: true,
  },
  advanced: {
    type: Boolean,
    optional: true,
  },
  solves: {
    type: [SolveTime],
    defaultValue: [],
  },

  bestIndex: {
    type: Number,
    optional: true,
  },
  // sortableBestValue is an order preserving (almost perfect) hash of the
  // best solve. This gives us a field we can ask the database to index on.
  sortableBestValue: {
    type: Number,
    min: 0,
    defaultValue: wca.MAX_INT,
  },

  worstIndex: {
    type: Number,
    optional: true,
  },

  average: {
    type: SolveTime,
    optional: true,
  },
  // sortableAverageValue is an order preserving (almost perfect) hash of the
  // average. This gives us a field we can ask the database to index on.
  sortableAverageValue: {
    type: Number,
    min: 0,
    defaultValue: wca.MAX_INT,
  },

  createdAt: createdAtSchemaField,
  updatedAt: updatedAtSchemaField,
});

Results.attachSchema(Schema.result);

if(Meteor.isServer) {
  Results._ensureIndex({
    competitionId: 1,
  });

  // Sorting by average, then best
  Results._ensureIndex({
    roundId: 1,
    sortableAverageValue: 1,
    sortableBestValue: 1,
  });

  // Sorting by best, then average
  Results._ensureIndex({
    roundId: 1,
    sortableBestValue: 1,
    sortableAverageValue: 1,
  });

  // One person should not appear twice in a round,
  // and unique names should be, well, unique =)
  Results._ensureIndex({
    roundId: 1,
    registrationId: 1,
  }, {
    unique: true,
  });

  // We want to be able to query for all the best results from the competition
  // for generating the podium page.
  Results._ensureIndex({
    competitionId: 1,
    position: 1,
  });
}
