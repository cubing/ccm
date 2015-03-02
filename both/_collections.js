// Force filter to be false. I really wish this was the default for SimpleSchema.
var oldClean = SimpleSchema.prototype.clean;
SimpleSchema.prototype.clean = function(doc, options) {
  options = options || {};
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

var GenderType = {
  type: String,
  allowedValues: _.keys(wca.genderByValue),
  autoform: {
    type: "select",
    options: function() {
      return wca.genders;
    }
  },
};

var DobType = {
  type: Date,
  label: "Birthdate",
  autoform: {
    afFieldInput: {
      type: "date",
      placeholder: "MM/DD/YYYY",
    }
  },
};

var CountryIdType = {
  type: String,
  allowedValues: wca.countryISO2Codes,
  autoform: {
    type: "selectize",
    options: wca.countryISO2AutoformOptions,
  },
};

var WcaIdType = {
  label: "WCA id",
  type: String,
  regEx: /^(19|20)\d{2}[A-Z]{4}\d{2}$/,
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
    decimal: true, // To support FMC average, which contains decimals
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
  // Note that we don't use an autovalue for this. This is because we do
  // trust clients to send us timestamps if they want to.
  updatedAt: {
    type: Date,
    optional: true
  },
});

MIN_ROUND_DURATION_MINUTES = 30;
DEFAULT_ROUND_DURATION_MINUTES = 60;
DEFAULT_ROUND_NTHDAY = 0;
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
    defaultValue: DEFAULT_ROUND_NTHDAY,
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
    min: MIN_ROUND_DURATION_MINUTES,
    defaultValue: DEFAULT_ROUND_DURATION_MINUTES,
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
    // How many participants we expect to allow into this round.
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
            var eventCode = eventCodeField.value;
            if(wca.eventAllowsCutoffs(eventCode)) {
              return {
                millis: 1000*wca.DEFAULT_HARD_CUTOFF_SECONDS_BY_EVENTCODE[eventCode],
                decimals: 0,
              };
            }
          }
          this.unset();
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
  progress: {
    type: new SimpleSchema({
      done: {
        type: Number,
        // done is meant to give a sense of how many people are done, and
        // people can be partway done.
        decimal: true,
        min: 0,
      },
      total: {
        type: Number,
        min: 0,
      },
    }),
    optional: true,
  },
});
if(Meteor.isServer) {
  Rounds._ensureIndex({
    competitionId: 1,
  });
}

var Result = function(doc) {
  _.extend(this, doc);
};

Result.prototype.getExpectedSolveCount = function() {
  // This transform trick came from
  //  https://www.eventedmind.com/feed/meteor-transforming-collection-documents
  // However, it doesn't address the fact that callers shouldn't need to know
  // what attributes we need in the Result. Here we just assert that
  // we've got the fields we need. Anyone who wants to call this method will
  // need to be changed to query for the right fields beforehand.
  assert(this.hasOwnProperty('roundId'));
  assert(this.hasOwnProperty('solves'));

  var round = Rounds.findOne(this.roundId, {
    fields: {
      formatCode: 1,
      softCutoff: 1,
    }
  });
  if(!round.softCutoff) {
    var roundFormat = wca.formatByCode[round.formatCode];
    return roundFormat.count;
  }
  var softCutoffFormat = wca.softCutoffFormatByCode[round.softCutoff.formatCode];
  var expectedSolveCount = softCutoffFormat.getExpectedSolveCount(this.solves, round.softCutoff.time, round.formatCode);
  return expectedSolveCount;
};

Results = new Mongo.Collection("results", {
  transform: function(doc) {
    return new Result(doc);
  },
});
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

  bestIndex: {
    type: Number,
    optional: true,
  },
  // sortableBestValue is an order preserving (almost perfect) hash of the
  // best solve. This gives us a field we can ask the database to index on.
  sortableBestValue: {
    type: Number,
    min: 0,
    optional: true,
  },

  worstIndex: {
    type: Number,
    optional: true,
  },

  average: {
    type: SolveTime,
    optional: true,
  },
  // sortableAverageValue is an order preserving (almost perfect) hash of the
  // average. This gives us a field we can ask the database to index on.
  sortableAverageValue: {
    type: Number,
    min: 0,
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

  // Sorting by average, then best
  Results._ensureIndex({
    roundId: 1,
    sortableAverageValue: 1,
    sortableBestValue: 1,
  });

  // Sorting by best, then average
  Results._ensureIndex({
    roundId: 1,
    sortableBestValue: 1,
    sortableAverageValue: 1,
  });

  // One person should not appear twice in a round,
  // and unique names should be, well, unique =)
  Results._ensureIndex({
    roundId: 1,
    registrationId: 1,
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
        optional: true,
      },
      wcaId: _.extend({}, WcaIdType, { optional: true }),
      countryId: _.extend({}, CountryIdType, { optional: true }),
      gender: _.extend({}, GenderType, { optional: true }),
      dob: _.extend({}, DobType, { optional: true }),
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
  var doc = Collection.findOne({ _id: id }, { fields: fields });
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
