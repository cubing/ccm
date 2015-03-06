function register(name, func) {
  if(Meteor.isClient) {
    Template.registerHelper(name, func);
  }
}
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

register("competition", function(attribute) {
  return getCompetitionAttribute(this.competitionId, attribute);
});

register("roundEventCode", function() {
  return getRoundAttribute(this.roundId, 'eventCode');
});
register("roundRoundCode", function() {
  return getRoundAttribute(this.roundId, 'roundCode');
});
register("roundFormatCode", function() {
  return getRoundAttribute(this.roundId, 'formatCode');
});

register("isSiteAdmin", function() {
  if(!Meteor.user()) {
    return false;
  }
  return Meteor.user().siteAdmin;
});

register("toAtMostFixed", function(n, fixed) {
  // Neat trick from http://stackoverflow.com/a/18358056
  return +(n.toFixed(fixed));
});
register("percentage", function(progress) {
  return progress.percentage();
});


clockFormat = function(solveTime) {
  return jChester.solveTimeToStopwatchFormat(solveTime);
};
register("clockFormat", function(solveTime) {
  return clockFormat(solveTime);
});

getCompetitionStartDateMoment = function(competitionId) {
  var startDate = getCompetitionAttribute(competitionId, 'startDate');
  if(!startDate) {
    return null;
  }
  return moment(startDate);
};
register("competitionStartDateMoment", function() {
  return getCompetitionStartDateMoment(this.competitionId);
});

getCompetitionEndDateMoment = function(competitionId) {
  var startDate = getCompetitionAttribute(competitionId, 'startDate');
  if(!startDate) {
    return null;
  }
  startDate = moment(startDate);
  var numberOfDays = getCompetitionAttribute(competitionId, 'numberOfDays');
  var endDate = startDate.clone().add(numberOfDays - 1, 'days');
  return endDate;
};
register("competitionEndDateMoment", function() {
  return getCompetitionEndDateMoment(this.competitionId);
});

getCompetitionRegistrationOpenMoment = function(competitionId) {
  var open = getCompetitionAttribute(competitionId, 'registrationOpenDate');
  if(!open) {
    return null;
  }
  return moment(open);
};
register("getCompetitionRegistrationOpenMoment", function() {
  return getCompetitionRegistrationOpenMoment(this.competitionId);
});

getCompetitionRegistrationCloseMoment = function(competitionId) {
  var close = getCompetitionAttribute(competitionId, 'registrationCloseDate');
  if(!close) {
    return null;
  }
  return moment(close);
};
register("getCompetitionRegistrationCloseMoment", function() {
  return getCompetitionRegistrationCloseMoment(this.competitionId);
});

getCompetitionNumberOfDays = function(competitionId) {
  var numberOfDays = getCompetitionAttribute(competitionId, 'numberOfDays');
  numberOfDays = parseInt(numberOfDays);
  return numberOfDays || 1;
};
register("competitionNumberOfDays", function() {
  return getCompetitionNumberOfDays(this.competitionId);
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

getCompetitionCalendarStartMinutes = function(competitionId) {
  var calendarStartMinutes = getCompetitionAttribute(competitionId, 'calendarStartMinutes');
  calendarStartMinutes = calendarStartMinutes || 0;
  return calendarStartMinutes;
};
register("competitionCalendarStartMinutes", function() {
  return getCompetitionCalendarStartMinutes(this.competitionId);
});

getCompetitionCalendarEndMinutes = function(competitionId) {
  var calendarEndMinutes = getCompetitionAttribute(competitionId, 'calendarEndMinutes');
  calendarEndMinutes = calendarEndMinutes || 23.5*60;
  return calendarEndMinutes;
};
register("competitionCalendarEndMinutes", function() {
  return getCompetitionCalendarEndMinutes(this.competitionId);
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

var DATE_FORMAT = "MMMM D, YYYY";
var ISO_DATE_FORMAT = "YYYY-MM-DD";
var DATETIME_FORMAT = "dddd, MMMM Do YYYY, h:mm:ss a z";

formatMomentDate = function(m) {
  return m.format(DATE_FORMAT);
};

formatMomentDateIso8601 = function(m) {
  var iso8601Date = m.format(ISO_DATE_FORMAT);
  return iso8601Date;
};

formatMomentDateRange = function(startMoment, endMoment) {
  var rangeStr = $.fullCalendar.formatRange(startMoment, endMoment, DATE_FORMAT);
  return rangeStr;
};

formatMomentDateTime = function(m) {
  return m.tz(LOCAL_TIMEZONE).format(DATETIME_FORMAT);
};

register("formatMomentDate", function(m) {
  return formatMomentDate(m);
});

register("formatMomentDateRange", function(startMoment, endMoment) {
  return formatMomentDateRange(startMoment, endMoment);
});

register("formatMomentDateTime", function(m) {
  return formatMomentDateTime(m);
});


getResultsWithUniqueNamesForRound = function(roundId, limit) {
  var round = Rounds.findOne(roundId);
  // Expand each result to also contain the uniqueName for that participant
  var registrations = Registrations.find({
    competitionId: round.competitionId,
    checkedInEvents: round.eventCode,
  }, {
    fields: { uniqueName: 1 }
  });
  var registrationById = {};
  registrations.forEach(function(registration) {
    registrationById[registration._id] = registration;
  });

  var results = Results.find({ roundId: roundId }, { limit: limit }).fetch();
  results.forEach(function(result) {
    var registration = registrationById[result.registrationId];
    if(!registration) {
      // The registration  for this result may not have been found by our earlier
      // query because checkedInEvents hasn't been populated yet. Just silently
      // continue here, knowing we'll get recalled when the data has arrived.
      return;
    }
    result.uniqueName = registration.uniqueName;
  });

  return results;
};


roundTitle = function(round) {
  var title;

  // Rounds don't necessarily have events, such as Lunch or Registration.
  if(round.eventCode) {
    title = round.eventName() + ": " + round.properties().name;
  } else {
    title = round.title;
  }

  return title;
};
register("roundTitle", function(round) {
  return roundTitle(round);
});

