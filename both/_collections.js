// For filter to be false. I really wish this was the default for SimpleSchema.
var oldClean = SimpleSchema.prototype.clean;
SimpleSchema.prototype.clean = function(doc, options) {
  options.filter = false;
  return oldClean.call(this, doc, options);
};

SimpleSchema.messages({
  "missingCompetitionStartDate": "Please set a competition start date before setting registration open/close dates.",
  "registrationCloseDateAfterRegistrationOpenDate": "Registration close date should be after the registration open date.",
  "missingRegistrationCloseDate": "Please enter a registration close date.",
});

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
  registrationCompetitorLimitCount: {
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

var GenderType = {
  type: String,
  allowedValues: _.keys(wca.genderByValue),
  optional: true,
  autoform: {
    type: "select",
    options: function() {
      return wca.genders;
    }
  },
};

var DobType = {
  type: Date,
  optional: true,
  label: "Birthdate",
  autoform: {
    afFieldInput: {
      type: "bootstrap-datepicker"
    }
  },
};

var CountryIdType = {
  type: String,
  allowedValues: wca.countryISO2Codes,
  optional: true,
  autoform: {
    type: "selectize",
    options: wca.countryISO2AutoformOptions,
  },
};

var WcaIdType = {
  label: "WCA id",
  type: String,
  regEx: /(19|20)\d{2}[A-Z]{4}\d{2}/,
  optional: true,
};

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
  },
  wcaId: WcaIdType,
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
    // Number of guests a competitor is bringing
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

// This is a copy of jChester's SolveTime schema
//  http://www.jflei.com/jChester/
SolveTime = new SimpleSchema({
  millis: {
    // The solve time in milliseconds, *with* any penalties applied
    type: Number,
    min: 0,
    optional: true,
  },
  decimals: {
    type: Number,
    min: 0,
    max: 3,
    optional: true,
  },
  moveCount: {
    type: Number,
    min: 0,
    optional: true,
  },
  penalties: {
    type: [String],
    allowedValues: _.keys(wca.penalties),
    optional: true,
  },
  puzzlesSolvedCount: {
    type: Number,
    min: 0,
    optional: true,
  },
  puzzlesAttemptedCount: {
    type: Number,
    min: 0,
    optional: true,
  },
  wcaValue: {
    type: Number,
    min: -2,
    autoValue: function() {
      var millisField = this.siblingField("millis");
      var moveCountField = this.siblingField("moveCount");
      var penaltiesField = this.siblingField("penalties");
      var puzzlesSolvedCountField = this.siblingField("puzzlesSolvedCount");
      var puzzlesAttemptedCountField = this.siblingField("puzzlesAttemptedCount");
      if(!millisField.isSet &&
         !moveCountField.isSet &&
         !penaltiesField.isSet &&
         !puzzlesSolvedCountField.isSet &&
         !puzzlesAttemptedCountField.isSet) {
        this.unset();
        return;
      }
      var wcaValue = wca.solveTimeToWcaValue({
        millis: millisField.value,
        moveCount: moveCountField.value,
        penalties: penaltiesField.value,
        puzzlesSolvedCount: puzzlesSolvedCountField.value,
        puzzlesAttemptedCount: puzzlesAttemptedCountField.value,
      });
      return wcaValue;
    },
    optional: true,
  },
});

// The name "Round" is a bit misleading here, as we use Rounds to store
// stuff like "Lunch" and "Registration" in addition to rounds with WCA events.
// It's basically anything that would show up in the schedule.
Rounds = new Mongo.Collection("rounds");
Rounds.attachSchema({
  competitionId: {
    type: String,
  },

  nthDay: {
    type: Number,
    min: 0,
    // should be <= numberOfDays in the corresponding Competition
    optional: true,
  },

  startMinutes: {
    // The time at which the round starts (stored as an offset from midnight in
    // minutes assuming no leap time or DST or anything. This means that 60*1.5
    // (1:30 AM) is sometimes ambiguous because sometimes there are multiple
    // 1:30 AMs in a given day.
    type: Number,
    min: 0,
    max: 24*60,
    optional: true,
  },
  durationMinutes: {
    type: Number,
    min: 0,
    defaultValue: 60,
  },

  title: {
    // This is only used by rounds that do *not* correspond to WCA events.
    type: String,
    optional: true,
  },

  // *** Attributes for real rounds for WCA events ***
  nthRound: {
    // Indexed from 1, because humans will see this in urls
    type: Number,
    min: 1,
    optional: true,
  },
  size: {
    // How many competitors we expect to allow into this round.
    // Based on attendance and time, more or fewer people may end up competing
    // in this round.
    type: Number,
    min: 0,
    optional: true,
  },
  softCutoff: {
    type: new SimpleSchema({
      time: {
        type: SolveTime,
      },
      formatCode: {
        type: String,
        allowedValues: _.keys(wca.softCutoffFormatByCode),
      }
    }),
    optional: true,
  },
  hardCutoff: {
    type: new SimpleSchema({
      time: {
        // This is the time limit per solve. Anything over the hard cutoff is a
        // DNF.
        type: SolveTime,
        autoValue: function() {
          if(this.isSet) {
            // If time is already set, don't overwrite it with the default.
            return;
          }
          var eventCodeField = this.field("eventCode");
          if(eventCodeField.isSet) {
            return {
              millis: 1000*wca.DEFAULT_HARD_CUTOFF_SECONDS_BY_EVENTCODE[eventCodeField.value],
              decimals: 0,
            };
          } else {
            this.unset();
          }
        },
      }
    }),
    optional: true,
  },
  eventCode: {
    type: String,
    allowedValues: _.keys(wca.eventByCode),
    optional: true,
  },
  roundCode: {
    // A WCA round code (this can be computed from nthRound, softCutoff, and
    // the total number of rounds for this eventCode). For example, round 1/4
    // is a "(Combined) First Round", but round 1/1 is a "(Combined) Final".
    type: String,
    allowedValues: _.keys(wca.roundByCode),
    optional: true,
  },
  formatCode: {
    type: String,
    allowedValues: _.keys(wca.formatByCode),
    optional: true,
  },
  status: {
    type: String,
    allowedValues: _.keys(wca.roundStatuses),
    defaultValue: wca.roundStatuses.unstarted,
    optional: true,
  },
});
if(Meteor.isServer) {
  Rounds._ensureIndex({
    competitionId: 1,
  });
}

Results = new Mongo.Collection("results");
Results.attachSchema({
  competitionId: {
    type: String,
  },
  roundId: {
    type: String,
  },
  registrationId: {
    type: String,
  },
  uniqueName: {
    type: String,
  },
  position: {
    type: Number,
    min: 0,
    optional: true,
  },
  advanced: {
    type: Boolean,
    optional: true,
  },
  solves: {
    type: [SolveTime],
    defaultValue: [],
  },
  best: {
    type: SolveTime,
    optional: true,
  },
  average: {
    type: SolveTime,
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
});
if(Meteor.isServer) {
  Results._ensureIndex({
    competitionId: 1,
  });
  Results._ensureIndex({
    roundId: 1,
    'average.wcaValue': 1,
    'best.wcaValue': 1,
    uniqueName: 1, // As a last resort to break ties, sort by uniqueName
  });

  // One person should not appear twice in a round,
  // and unique names should be, well, unique =)
  Results._ensureIndex({
    roundId: 1,
    registrationId: 1,
  }, {
    unique: true,
  });
  Results._ensureIndex({
    roundId: 1,
    uniqueName: 1,
  }, {
    unique: true,
  });
}

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
  Results._ensureIndex({
    competitionId: 1,
  });
}

Meteor.users.attachSchema(new SimpleSchema({
  emails: {
    type: [Object],
  },
  "emails.$.address": {
    type: String,
    regEx: SimpleSchema.RegEx.Email,
  },
  "emails.$.verified": {
    type: Boolean,
  },
  siteAdmin: {
    type: Boolean,
    defaultValue: false,
    optional: true,
  },
  createdAt: {
    type: Date
  },
  profile: {
    type: new SimpleSchema({
      name: {
        label: "Name",
        type: String,
      },
      wcaId: WcaIdType,
      countryId: CountryIdType,
      gender: GenderType,
      dob: DobType,
    }),
    optional: true,
  },
  services: {
    type: Object,
    optional: true,
    blackbox: true,
  },
}));

var getDocumentAttribute = function(Collection, id, attribute) {
  var fields = {};
  fields[attribute] = 1;
  var doc = Collection.findOne({
    _id: id
  }, {
    fields: fields
  });
  attribute.split(".").forEach(function(attr) {
    doc = doc[attr];
  });
  return doc;
};

getCompetitionAttribute = function(competitionId, attribute) {
  return getDocumentAttribute(Competitions, competitionId, attribute);
};

getUserAttribute = function(userId, attribute) {
  return getDocumentAttribute(Meteor.users, userId, attribute);
};

getRoundAttribute = function(roundId, attribute) {
  return getDocumentAttribute(Rounds, roundId, attribute);
};
