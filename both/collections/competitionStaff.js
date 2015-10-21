// Add functions to the Mongo object, using transform (see http://docs.meteor.com/#/full/mongo_collection)
let CompetitionStaffModel = function(doc) {
  _.extend(this, doc);
};

_.extend(CompetitionStaffModel.prototype, {
  user: function() {
    return Meteor.users.findOne(this.userId);
  },
});

CompetitionStaff = new Mongo.Collection("competitionStaff", {
  transform: function(doc) {
    return new CompetitionStaffModel(doc);
  },
});

var schema = new SimpleSchema({
  competitionId: {
    type: String,
  },
  userId: {
    type: String,
  },
  organizer: {
    type: Boolean,
    defaultValue: false,
    optional: true,
  },
  createdAt: createdAtSchemaField,
  updatedAt: updatedAtSchemaField,
});

CompetitionStaff.attachSchema(schema);

if(Meteor.isServer) {
  // The (competitionId, userId) pair should always be unique.
  CompetitionStaff._ensureIndex({
    competitionId: 1,
    userId: 1,
  }, {
    unique: 1,
  });
}
