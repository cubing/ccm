// Add functions to the Mongo object, using transform (see http://docs.meteor.com/#/full/mongo_collection)
Group = function(doc) {
  _.extend(this, doc);
};

_.extend(Group.prototype, {
  round: function() {
    return Rounds.findOne(this.roundId);
  },
});

Groups = new Mongo.Collection("groups", {
  transform: function(doc) {
    return new Group(doc);
  }
});

Schema.group = new SimpleSchema({
  competitionId: {
    type: String,
  },
  open: {
    type: Boolean,
    defaultValue: false,
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

Groups.attachSchema(Schema.group);

if(Meteor.isServer) {
  Groups._ensureIndex({
    competitionId: 1,
  });
}
