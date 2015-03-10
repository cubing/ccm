// Add functions to the Mongo object, using transform (see http://docs.meteor.com/#/full/mongo_collection)
RoundProgress = function(doc) {
  _.extend(this, doc);
};

_.extend(RoundProgress.prototype, {

  percentage: function() {
    return (this.total > 0 ? Math.round(100 * this.done / this.total) : 0);
  },
  isComplete: function() {
    return this.done === this.total;
  },
  isOverComplete: function() {
    return this.done > this.total;
  },
});

RoundProgresses = new Mongo.Collection("roundProgresses", { transform: function(doc) { return new RoundProgress(doc); } });

RoundProgresses.attachSchema({
  roundId: {
    type: String,
  },
  competitionId: { // Only needed for mass deletion
    type: String,
  },

  done: {
    type: Number,
    // done is meant to give a sense of how many people are done, and
    // people can be partway done.
    decimal: true,
    defaultValue: 0,
  },
  total: {
    type: Number,
    defaultValue: 0,
  },
});
