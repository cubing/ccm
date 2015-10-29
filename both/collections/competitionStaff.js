// Add functions to the Mongo object, using transform (see http://docs.meteor.com/#/full/mongo_collection)
let CompetitionStaffModel = function(doc) {
  _.extend(this, doc);
};

_.extend(CompetitionStaffModel.prototype, {
  user() {
    return Meteor.users.findOne(this.userId);
  },
});

CompetitionStaff = new Mongo.Collection("competitionStaff", {
  transform(doc) {
    return new CompetitionStaffModel(doc);
  },
});

let OptionalBoolean = {
  type: Boolean,
  defaultValue: false,
  optional: true,
};

var schema = new SimpleSchema({
  competitionId: {
    type: String,
  },
  userId: {
    type: String,
  },

  roles: {
    type: new SimpleSchema(_.object(RoleHeirarchy.allRoles.map(role => [ role.name, OptionalBoolean ]))),
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
