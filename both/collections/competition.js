SimpleSchema.messages({
  registrationCloseDateAfterRegistrationOpenDate: "Registration close date should be after the registration open date.",
  missingRegistrationCloseDate: "Please enter a registration close date.",
  calendarEndIsNotBeforeStart: "End time must be after start time.",
});

Competition = function(doc) {
  _.extend(this, doc);
};

_.extend(Competition.prototype, {
});

Competitions = new Mongo.Collection("competitions", { transform: function(doc) { return new Competition(doc); } });
Competitions.attachSchema({
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
    }
  },
  calendarEndMinutes: {
    type: Number,
    label: "Schedule end time",
    min: 0,
    max: 23.5*60,
    defaultValue: 23.5*60,
    custom: function() {
      // require the competition calendar end time to be after the start time
      var calendarStartMinutes = this.field("calendarStartMinutes").value;
      var calendarEndMinutes = this.value;
      if(calendarEndMinutes <= calendarStartMinutes) {
        return "calendarEndIsNotBeforeStart";
      }
      return null;
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
      // Require registration open date to be before the close date.

      var registrationCloseDate = this.field("registrationCloseDate").value;
      var registrationOpenDate = this.value;

      if(!registrationCloseDate && !registrationOpenDate) {
        // OK to have neither filled (esp. for competition creation)
        return null;
      }

      if(!registrationCloseDate) {
        return "missingRegistrationCloseDate";
      }

      if(!registrationOpenDate) {
        return "missingRegistrationOpenDate";
      }

      if(registrationOpenDate.getTime() < registrationCloseDate.getTime()) {
        return null;
      } else {
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
      // require the registration close date to be before the competition starts.

      var competitionStartDate = this.field("startDate").value;
      var registrationCloseDate = this.value;
      var registrationOpenDate = this.field("registrationOpenDate").value;

      if(!registrationCloseDate && !registrationOpenDate) {
        // OK to have neither filled (esp. for competition creation)
        return null;
      }

      if(!registrationCloseDate) {
        return "missingRegistrationCloseDate";
      }

      if(!registrationOpenDate) {
        return "missingRegistrationOpenDate";
      }

      return null;
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

if(Meteor.isServer) {
  Competitions._ensureIndex({
    wcaCompetitionId: 1,
  }, {
    sparse: 1,
    unique: 1,
  });
}
