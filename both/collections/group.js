// Add functions to the Mongo object, using transform (see http://docs.meteor.com/#/full/mongo_collection)
Group = function(doc) {
  _.extend(this, doc);
};

_.extend(Group.prototype, {
  round: function() {
    return Rounds.findOne(this.roundId);
  },
});

Groups = new Mongo.Collection("groups", { transform: function(doc) { return new Group(doc); } });
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
if(Meteor.isServer) {
  Groups._ensureIndex({
    competitionId: 1,
  });
}
