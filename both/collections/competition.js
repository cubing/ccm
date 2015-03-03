Competitions = new Mongo.Collection("competitions");
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
    min: 0,
    max: 24*60,
    defaultValue: 0,
  },
  calendarEndMinutes: {
    type: Number,
    min: 0,
    max: 24*60,
    defaultValue: 24*60,
  },
  startDate: {
    type: Date,
    autoform: {
      afFieldInput: {
        type: "bootstrap-datepicker"
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
        type: "bootstrap-datetimepicker"
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
        type: "bootstrap-datetimepicker"
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
