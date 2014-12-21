// For filter to be false. I really wish this was the default for SimpleSchema.
var oldClean = SimpleSchema.prototype.clean;
SimpleSchema.prototype.clean = function(doc, options) {
  options.filter = false;
  return oldClean.call(this, doc, options);
};

Competitions = new Meteor.Collection("competitions");
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
  },
  numberOfDays: {
    type: Number,
    min: 1,
    defaultValue: 1,
  },
  registrationOpenDate: {
    type: Date,
    optional: true,
  },
  registrationCloseDate: {
    type: Date,
    optional: true,
  },

  // Should these be moved to isStaff and isOrganizer fields in Registrations?
  staff: {
    type: [String],
    defaultValue: [],
  },
  organizers: {
    type: [String],
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

Registrations = new Meteor.Collection("registrations");
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
  },
  events: {
    type: [String],
    allowedValues: _.keys(wca.eventByCode),
    autoform: {
      type: "select-checkbox",
    },
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

});
if(Meteor.isServer) {
  Registrations._ensureIndex({
    competitionId: 1,
    userId: 1
  }, {
    unique: 1
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
Rounds = new Meteor.Collection("rounds");
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

Results = new Meteor.Collection("results");
Results.attachSchema({
  competitionId: {
    type: String,
  },
  roundId: {
    type: String,
  },
  userId: {
    type: String,
  },
  position: {
    type: Number,
    min: 0,
    optional: true,
  },
  solves: {
    type: [SolveTime],
    optional: true,
  },
  best: {
    type: SolveTime,
    optional: true,
  },
  average: {
    type: SolveTime,
    optional: true,
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
    userId: 1, // As a last resort to break ties, sort by userId
  });
}

Groups = new Meteor.Collection("groups");
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
  createdAt: {
    type: Date,
  },
  profile: {
    type: new SimpleSchema({
      name: {
        label: "Name",
        type: String,
        optional: true,
      },
      wcaId: {
        label: "WCA id",
        type: String,
        regEx: /(19|20)\d{2}[A-Z]{4}\d{2}/,
        optional: true,
      },
      countryId: {
        type: String,
        regEx: /^[A-Z]{2}$/,
        optional: true,
      },
      gender: {
        type: String,
        allowedValues: ['m', 'f', 'o'],
        optional: true,
      },
      dob: {
        type: Date,
        optional: true,
      },

      siteAdmin: {
        type: Boolean,
        defaultValue: false,
        optional: true,
      },
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

// This is a workaround for meteor-autocomplete to get preferential matching.
// See https://github.com/mizzao/meteor-autocomplete/issues/43#issuecomment-58921769
MeteorUsersPreferentialMatching = {
  find: function(selector, options) {
    var allResults = Meteor.users.find(selector, options).fetch();
    selector['profile.name'].$regex = "\\b" + selector['profile.name'].$regex;
    var preferredResults = Meteor.users.find(selector, options).fetch();

    var seenIds = {};
    var arr = [];
    var addResult = function(result) {
      if(seenIds[result._id]) {
        return;
      }
      seenIds[result._id] = true;
      arr.push(result);
    };
    var i;
    for(i = 0; i < preferredResults.length; i++) {
      addResult(preferredResults[i]);
    }
    for(i = 0; i < allResults.length; i++) {
      addResult(allResults[i]);
    }
    arr.count = function() { return arr.length; };
    return arr;
  }
};
