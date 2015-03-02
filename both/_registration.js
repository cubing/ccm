Registrations = new Mongo.Collection("registrations");
Registrations.attachSchema({
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
      // this.docId is not available to the client on the first validation check
      // due to a bug. When the server validation hits then the docId makes it
      // back to the client.
      // See: https://github.com/aldeed/meteor-collection2/pull/164
      // And: https://github.com/aldeed/meteor-simple-schema/issues/208
      var docId = this.docId;
      var userId = this.field('userId').value;
      var compId = this.field('competitionId').value;
      var uniqueName = this.value;

      var uniqueMatch = Registrations.findOne({
        competitionId: compId,
        uniqueName: uniqueName,
      });

      if(uniqueMatch && (this.isInsert || docId != uniqueMatch._id)) {
        return "notUnique";
      }

    }
  },
  wcaId: _.extend({}, WcaIdType, { optional: true }),
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
  // Force value to be current date (on server) upon insert
  // and prevent updates thereafter.
  createdAt: {
    type: Date,
    autoValue: function() {
      if(this.isInsert) {
        return new Date();
      } else if(this.isUpsert) {
        return {$setOnInsert: new Date()};
      } else {
        this.unset();
      }
    }
  },
  // Force value to be current date (on server) upon update
  // and don't allow it to be set upon insert.
  updatedAt: {
    type: Date,
    autoValue: function() {
      if(this.isUpdate) {
        return new Date();
      }
    },
    denyInsert: true,
    optional: true
  },
});
if(Meteor.isServer) {
  // The (competitionId, uniqueName) pair should always be unique.
  Registrations._ensureIndex({
    competitionId: 1,
    uniqueName: 1,
  }, {
    unique: 1,
  });
}
