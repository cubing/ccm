Registrations = new Mongo.Collection("registrations");
var schema = new SimpleSchema({
  competitionId: {
    type: String,
    autoform: {
      type: "hidden"
    },
  },
  userId: {
    type: String,
    autoform: {
      type: "hidden"
    },
    optional: true,
  },
  uniqueName: {
    type: String,
    custom: function() {
      var obj = validationObject(this, ['uniqueName', 'userId', 'competitionId']);

      var uniqueMatch = Registrations.findOne({
        competitionId: obj.competitionId,
        uniqueName: obj.uniqueName,
      });

      if(obj.uniqueMatch && (this.isInsert || obj.id != uniqueMatch._id)) {
        return "notUnique";
      }
    }
  },
  wcaId: _.extend({ optional: true }, WcaIdType),
  countryId: CountryIdType,
  gender: GenderType,
  dob: DobType,
  staff: {
    type: Boolean,
    optional: true,
  },
  organizer: {
    type: Boolean,
    optional: true,
  },
  registeredEvents: {
    type: [String],
    allowedValues: _.keys(wca.eventByCode),
    defaultValue: [],
    autoform: {
      type: "select-checkbox",
    },
  },
  checkedInEvents: {
    type: [String],
    defaultValue: [],
    allowedValues: _.keys(wca.eventByCode),
  },
  guestCount: {
    // Number of guests a participant is bringing
    // (in case the venue has a size limit)
    type: Number,
    min: 0,
    optional: true,
  },
  comments: {
    // Comments a user makes upon registering
    type: String,
    optional: true,
    autoform: {
      afFieldInput: {
        type: "textarea"
      }
    },
  },
  createdAt: createdAtSchemaField,
  updatedAt: updatedAtSchemaField,
});

schema.messages({
  notUnique: "Someone is already registered with that name.",
});

Registrations.attachSchema(schema);

if(Meteor.isServer) {
  // The (competitionId, uniqueName) pair should always be unique.
  Registrations._ensureIndex({
    competitionId: 1,
    uniqueName: 1,
  }, {
    unique: 1,
  });
}
