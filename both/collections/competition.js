Competition = function(doc) {
  _.extend(this, doc);
};

_.extend(Competition.prototype, {
});

Competitions = new Mongo.Collection("competitions", { transform: function(doc) { return new Competition(doc); } });
var schema = new SimpleSchema({
  competitionName: {
    type: String,
    label: "Competition name",
  },
  wcaCompetitionId: {
    type: String,
    label: "WCA competition id",
    optional: true,
  },
  listed: {
    type: Boolean,
    label: "Listed",
  },
  calendarStartMinutes: {
    type: Number,
    label: "Schedule start time",
    min: 0,
    max: 23*60,
    defaultValue: 0,
    autoform: {
      afFieldInput: {
        type: "timeOfDayMinutes"
      }
    },
    custom: function() {
      var obj = validationObject(this, ['calendarStartMinutes']);

      var events = ScheduleEvents.find({competitionId: obj.id}).fetch();
      if(_.any(events, function(event){ return event.startMinutes < obj.calendarStartMinutes; })) {
        return "earlierExistingEvents";
      }
    },
  },
  calendarEndMinutes: {
    type: Number,
    label: "Schedule end time",
    min: 0,
    max: 23.5*60,
    defaultValue: 23.5*60,
    custom: function() {
      var obj = validationObject(this, ['calendarStartMinutes', 'calendarEndMinutes']);

      if(obj.calendarEndMinutes <= obj.calendarStartMinutes) {
        return "calendarEndIsNotBeforeStart";
      }

      var events = ScheduleEvents.find({competitionId: obj.id}).fetch();
      if(_.any(events, function(event){ return event.endMinutes() > obj.calendarEndMinutes; })) {
        return "laterExistingEvents";
      }
    },
    autoform: {
      afFieldInput: {
        type: "timeOfDayMinutes"
      }
    }
  },
  startDate: {
    type: Date,
    autoform: {
      afFieldInput: {
        type: "date"
      }
    },
  },
  numberOfDays: {
    type: Number,
    min: 1,
    defaultValue: 1,
    custom: function() {
      var obj = validationObject(this, ['numberOfDays']);

      var events = ScheduleEvents.find({competitionId: obj.id}).fetch();
      if(_.any(events, function(event){ return event.nthDay >= obj.numberOfDays; })) {
        return "laterDayExistingEvents";
      }
    },
  },
  registrationOpenDate: {
    type: Date,
    optional: true,
    autoform: {
      afFieldInput: {
        type: "datetime-local"
      }
    },
    custom: function() {
      var obj = validationObject(this, ['registrationOpenDate', 'registrationCloseDate']);

      if(!obj.registrationCloseDate && !obj.registrationOpenDate) {
        // OK to have neither filled (esp. for competition creation)
        return null;
      }

      if(!obj.registrationCloseDate) {
        return "missingRegistrationCloseDate";
      }

      if(!obj.registrationOpenDate) {
        return "missingRegistrationOpenDate";
      }

      if(obj.registrationOpenDate.getTime() >= obj.registrationCloseDate.getTime()) {
        return "registrationCloseDateAfterRegistrationOpenDate";
      }
    },
  },
  registrationCloseDate: {
    type: Date,
    optional: true,
    autoform: {
      afFieldInput: {
        type: "datetime-local"
      }
    },
    custom: function() {
      // TODO require the registration close date to be before the competition starts?
      var obj = validationObject(this, ['registrationOpenDate', 'registrationCloseDate']);

      if(!obj.registrationCloseDate && !obj.registrationOpenDate) {
        // OK to have neither filled (esp. for competition creation)
        return null;
      }

      if(!obj.registrationCloseDate) {
        return "missingRegistrationCloseDate";
      }

      if(!obj.registrationOpenDate) {
        return "missingRegistrationOpenDate";
      }
    },
  },
  registrationAskAboutGuests: {
    type: Boolean,
    label: "Ask competitors if they are bringing guests",
    min: 0,
    optional: true,
  },
  registrationParticipantLimitCount: {
    type: Number, // empty = no limit
    label: "Maximum number of competitors (leave empty for no limit)",
    min: 1,
    optional: true,
  },
  registrationAttendeeLimitCount: {
    type: Number, // empty = no limit
    label: "Maximum number of attendees (guests + competitors; leave empty for no limit)",
    min: 1,
    optional: true,
  },
  createdAt: createdAtSchemaField,
  updatedAt: updatedAtSchemaField,
  // information about competition location
  location: {
    type: new SimpleSchema({
      addressText: {
        type: String,
        optional: true,
        autoform: {
          afFieldInput: {
            type: "hidden",
          }
        },
      },
      lat: {
        type: Number,
        optional: true,
        decimal: true,
        autoform: {
          afFieldInput: {
            type: "hidden",
          }
        },
      },
      lng: {
        type: Number,
        optional: true,
        decimal: true,
        autoform: {
          afFieldInput: {
            type: "hidden",
          }
        },
      },
      // city: {
      //   type: String,
      //   optional: true,
      //   autoform: {
      //     afFieldInput: {
      //       type: "hidden",
      //     }
      //   },
      // },
      // stateOrProvince: {
      //   type: String,
      //   optional: true,
      //   autoform: {
      //     afFieldInput: {
      //       type: "hidden",
      //     }
      //   },
      // },
      // countryId: {
      //   type: String,
      //   optional: true,
      //   allowedValues: wca.countryISO2Codes,
      //   autoform: {
      //     afFieldInput: {
      //       type: "hidden",
      //     }
      //   },
      // },
    }),
    optional: true,
  },
});
schema.messages({
  registrationCloseDateAfterRegistrationOpenDate: "Registration close date should be after the registration open date.",
  missingRegistrationOpenDate: "Please enter a registration open date.",
  missingRegistrationCloseDate: "Please enter a registration close date.",
  calendarEndIsNotBeforeStart: "End time must be after start time.",
  earlierExistingEvents: "There are events earlier in the day.",
  laterExistingEvents: "There are events later in the day.",
  laterDayExistingEvents: "There are events after the last day.",
});
Competitions.attachSchema(schema);

if(Meteor.isServer) {
  Competitions._ensureIndex({
    wcaCompetitionId: 1,
  }, {
    sparse: 1,
    unique: 1,
  });
}
