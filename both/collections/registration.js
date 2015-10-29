const log = logging.handle("registration");

// Add functions to the Mongo object, using transform (see http://docs.meteor.com/#/full/mongo_collection)
let Registration = function(doc) {
  _.extend(this, doc);
};

_.extend(Registration.prototype, {
  checkIn: function(toCheckIn) {
    // This method is called to check-in a participant for the first time,
    // to update their check-in because the set of events they are registered for
    // changed, or to uncheck them in from the competition. If accomplishing this
    // would require deleting results with data, we throw an error and do nothing.
    let firstRounds = Rounds.find({
      competitionId: this.competitionId,
      nthRound: 1,
    }, {
      fields: { _id: 1, eventCode: 1 }
    }).fetch();

    [true, false].forEach(simulate => {
      firstRounds.forEach(round => {
        let result = Results.findOne({
          roundId: round._id,
          registrationId: this._id,
        });
        let registeredForEvent = _.contains(this.registeredEvents, round.eventCode);
        let shouldHaveResultForRound = toCheckIn && registeredForEvent;
        let hasResultForRound = !!result;

        if(hasResultForRound == shouldHaveResultForRound) {
          // Nothing to do.
          return;
        }
        if(shouldHaveResultForRound) {
          // Need to register for round.
          if(!simulate) {
            log.l1("Creating result for registration", this._id, "in", round.eventCode, "round 1");
            Results.insert({
              competitionId: this.competitionId,
              roundId: round._id,
              registrationId: this._id,
            });
          }
        } else {
          // Need to unregister for round. First check if it's safe to delete
          // their results.
          if(simulate) {
            if(result) {
              // This registrant has a result for this round that we no longer want them
              // in. If they actually have results for this round, throw an exception
              // rather than deleting data irreversibly.
              let hasSolves = _.filter(result.solves, s => s !== null).length > 0;
              if(hasSolves) {
                let reason = "Cannot unregister " + this.uniqueName + " for " + round.eventCode + " round 1 because they already have results in that round.";
                throw new Meteor.Error(403, reason);
              }
            }
          } else {
            log.l1("Removing result for registration", this._id, "in", round.eventCode, "round 1");
            Results.remove({
              roundId: round._id,
              registrationId: this._id,
            });
          }
        }

        // Update round progress
        RoundSorter.addRoundToSort(round._id);
      });
    });
    Registrations.update(this._id, { $set: { checkedIn: toCheckIn } });
  },
  user() {
    return Meteor.users.findOne(this.userId);
  },
});

Registrations = new Mongo.Collection("registrations", {
  transform: function(doc) {
    return new Registration(doc);
  },
});

let OptionalBoolean = {
  type: Boolean,
  defaultValue: false,
  optional: true,
};

let schema = new SimpleSchema({
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
      let obj = validationObject(this, ['uniqueName', 'userId', 'competitionId']);

      let uniqueMatch = Registrations.findOne({
        competitionId: obj.competitionId,
        uniqueName: obj.uniqueName,
      });

      if(obj.uniqueMatch && (this.isInsert || obj.id != uniqueMatch._id)) {
        return "notUnique";
      }
    }
  },
  wcaId: _.extend({ optional: true }, WcaIdType),
  countryId: _.extend({ optional: true }, CountryIdType),
  gender: _.extend({optional: true }, GenderType),
  dob: _.extend({ optional: true }, DobType),
  registeredEvents: {
    type: [String],
    allowedValues: _.keys(wca.eventByCode),
    defaultValue: [],
    autoform: {
      type: "select-checkbox",
    },
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
  checkedIn: {
    type: Boolean,
    defaultValue: false,
  },
  roles: {
    type: new SimpleSchema(_.object(RoleHeirarchy.allRoles.map(role => [ role.name, OptionalBoolean ]))),
    optional: true,
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
