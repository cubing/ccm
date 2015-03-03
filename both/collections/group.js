Groups = new Mongo.Collection("groups");
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
