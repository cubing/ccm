function register(name, func) {
  if(Meteor.isClient) {
    Template.registerHelper(name, func);
  }
}

register("not", function(thing) {
  return !thing;
});

register("roundName", function(roundCode) {
  return wca.roundByCode[roundCode].name;
});
register("eventName", function(eventCode) {
  return wca.eventByCode[eventCode].name;
});
register("formatName", function(formatCode) {
  return wca.formatByCode[formatCode].name;
});
register("formatShortName", function(formatCode) {
  return wca.formatByCode[formatCode].shortName;
});
register("wcaFormats", function() {
  return wca.formats;
});

register("softCutoffFormatName", function(softCutoffFormatCode) {
  return wca.softCutoffFormatByCode[softCutoffFormatCode].name;
});

register("eventAllowsCutoffs", function(eventCode) {
  return wca.eventAllowsCutoffs(eventCode);
});

register("competitionAttr", function(attribute) {
  var competition = Competitions.findOne(this.competitionId);
  return competition ? competition[attribute] : null;
});

register("roundEventCode", function() {
  return getRound(this.roundId).eventCode;
});
register("roundRoundCode", function() {
  return getRound(this.roundId).roundCode();
});
register("roundFormatCode", function() {
  return getRound(this.roundId).formatCode;
});

register("userIsSiteAdmin", function() {
  return Meteor.user() && Meteor.user().siteAdmin;
});

register("toAtMostFixed", function(n, fixed) {
  // Neat trick from http://stackoverflow.com/a/18358056
  return +(n.toFixed(fixed));
});


clockFormat = function(solveTime) {
  return jChester.solveTimeToStopwatchFormat(solveTime);
};
register("clockFormat", function(solveTime) {
  return clockFormat(solveTime);
});

getCompetitionEvents = function(competitionId) {
  var rounds = Rounds.find({ competitionId: competitionId }, { fields: { eventCode: 1 } }).fetch();

  var eventCodes = {};
  rounds.forEach(function(round) {
    eventCodes[round.eventCode] = true;
  });
  var events = _.chain(wca.events)
    .filter(function(e) {
      return eventCodes[e.code];
    })
    .map(function(e) {
      return {
        competitionId: competitionId,
        eventCode: e.code,
      };
    })
    .value();
  return events;
};
register("competitionEvents", function() {
  return getCompetitionEvents(this.competitionId);
});

register("canManageCompetition", function(userId) {
  var cannotManageReason = getCannotManageCompetitionReason(userId, this.competitionId);
  return !cannotManageReason;
});

isRegisteredForCompetition = function(userId, competitionId) {
  var competition = Registrations.findOne({
    competitionId: competitionId,
    userId: userId,
  }, {
    fields: { _id: 1 }
  });
  return !!competition;
};
register("isRegisteredForCompetition", function(userId) {
  return isRegisteredForCompetition(userId, this.competitionId);
});

minutesToPrettyTime = function(timeMinutes) {
  var duration = moment.duration(timeMinutes, 'minutes');
  var timeMoment = moment({
    hour: duration.hours(),
    minutes: duration.minutes(),
  });
  return timeMoment.format("h:mma");
};
register("minutesToPrettyTime", function(timeMinutes) {
  return minutesToPrettyTime(timeMinutes);
});

getLastRoundIdForEvent = function(competitionId, eventCode) {
  var lastRoundForEvent = Rounds.findOne({
    competitionId: competitionId,
    eventCode: eventCode,
  }, {
    sort: { "nthRound": -1 },
    fields: { _id: 1 }
  });
  if(!lastRoundForEvent) {
    return null;
  }
  return lastRoundForEvent._id;
};

var LOCAL_TIMEZONE = jstz.determine().name();

var DATE_FORMAT = "LL";
var ISO_DATE_FORMAT = "YYYY-MM-DD";
var DATETIME_FORMAT = "LLLL z";

formatMomentDate = function(m) {
  return m.utc().format(DATE_FORMAT);
};

formatMomentDateIso8601 = function(m) {
  var iso8601Date = m.utc().format(ISO_DATE_FORMAT);
  return iso8601Date;
};

formatMomentDateTime = function(m) {
  return m.tz(LOCAL_TIMEZONE).format(DATETIME_FORMAT);
};

register("formatMomentDate", function(m) {
  return formatMomentDate(m);
});

register("formatMomentDateTime", function(m) {
  return formatMomentDateTime(m);
});


getResultsWithRegistrations = function(roundId, limit) {
  var round = Rounds.findOne(roundId);
  // Join each Result its Registration.
  var registrations = Registrations.find({
    competitionId: round.competitionId,
    registeredEvents: round.eventCode,
  });
  var registrationById = {};
  registrations.forEach(function(registration) {
    registrationById[registration._id] = registration;
  });

  var results = Results.find({ roundId: roundId }, { limit: limit }).fetch();
  results.forEach(function(result) {
    var registration = registrationById[result.registrationId];
    if(!registration) {
      // The registration for this result may not have been found by our earlier
      // query because registeredEvents hasn't been populated yet. Just silently
      // continue here, knowing we'll get called again when the data has arrived.
      return;
    }
    result.registration = registration;
  });

  return results;
};
