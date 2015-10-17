// Add functions to the Mongo object, using transform (see http://docs.meteor.com/#/full/mongo_collection)
var Result = function(doc) {
  _.extend(this, doc);
};

_.extend(Result.prototype, {
  getExpectedSolveCount: function() {
    if(this.noShow) {
      return 0;
    }
    var round = Rounds.findOne(this.roundId, {
      fields: {
        formatCode: 1,
        softCutoff: 1,
      }
    });
    if(!round.softCutoff) {
      return round.format().count;
    }
    var softCutoffFormat = wca.softCutoffFormatByCode[round.softCutoff.formatCode];
    var expectedSolveCount = softCutoffFormat.getExpectedSolveCount(this.solves, round.softCutoff.time, round.formatCode);
    return expectedSolveCount;
  },
  allSolves: function() {
    // Sanitize the solves array to contain all current and future solves.
    var round = Rounds.findOne(this.roundId, {
      fields: {
        formatCode: 1,
        softCutoff: 1,
      }
    });

    var solves = this.solves || [];
    while(solves.length < round.format().count) {
      solves.push(null);
    }
    return solves;
  },
});

Results = new Mongo.Collection("results", {
  transform: function(doc) {
    return new Result(doc);
  },
});
Results.attachSchema({
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
}
