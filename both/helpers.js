if(Meteor.isClient) {
  Template.registerHelper("roundName", function(roundCode) {
    return wca.roundByCode[roundCode].name;
  });
  Template.registerHelper("eventName", function(eventCode) {
    return wca.eventByCode[eventCode].name;
  });
  getEventIcon = function(eventCode) {
    return "/img/" + eventCode + ".svg";
  };
  Template.registerHelper("eventIcon", function(eventCode) {
    return getEventIcon(eventCode);
  });
  Template.registerHelper("formatName", function(formatCode) {
    return wca.formatByCode[formatCode].name;
  });
  Template.registerHelper("formatShortName", function(formatCode) {
    return wca.formatByCode[formatCode].shortName;
  });
  Template.registerHelper("wcaFormats", function() {
    return wca.formats;
  });

  Template.registerHelper("softCutoffFormatName", function(softCutoffFormatCode) {
    return wca.softCutoffFormatByCode[softCutoffFormatCode].name;
  });

  Template.registerHelper("eventAllowsCutoffs", function(eventCode) {
    return wca.eventAllowsCutoffs(eventCode);
  });

  Template.registerHelper("competition", function(attribute) {
    return getCompetitionAttribute(this.competitionId, attribute);
  });

  Template.registerHelper("roundEventCode", function() {
    return getRoundAttribute(this.roundId, 'eventCode');
  });
  Template.registerHelper("roundRoundCode", function() {
    return getRoundAttribute(this.roundId, 'roundCode');
  });
  Template.registerHelper("roundFormatCode", function() {
    return getRoundAttribute(this.roundId, 'formatCode');
  });
  Template.registerHelper("roundCompetitionId", function() {
    return getRoundAttribute(this.roundId, 'competitionId');
  });

  Template.registerHelper("isSiteAdmin", function() {
    if(!Meteor.user()) {
      return false;
    }
    return Meteor.user().siteAdmin;
  });

  Template.registerHelper("toAtMostFixed", function(n, fixed) {
    // Neat trick from http://stackoverflow.com/a/18358056
    return +(n.toFixed(fixed));
  });
  Template.registerHelper("percentage", function(progress) {
    if(progress.total === 0) {
      return 0;
    }
    return Math.round(100.0 * progress.done / progress.total);
  });
}

clockFormat = function(solveTime) {
  return jChester.solveTimeToStopwatchFormat(solveTime);
};
if(Meteor.isClient) {
  Template.registerHelper("clockFormat", function(solveTime) {
    return clockFormat(solveTime);
  });
}

getCompetitionStartDateMoment = function(competitionId) {
  var startDate = getCompetitionAttribute(competitionId, 'startDate');
  if(!startDate) {
    return null;
  }
  return moment(startDate);
};
if(Meteor.isClient) {
  Template.registerHelper("competitionStartDateMoment", function() {
    return getCompetitionStartDateMoment(this.competitionId);
  });
}

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
if(Meteor.isClient) {
  Template.registerHelper("competitionEndDateMoment", function() {
    return getCompetitionEndDateMoment(this.competitionId);
  });
}

getCompetitionRegistrationOpenMoment = function(competitionId) {
  var open = getCompetitionAttribute(competitionId, 'registrationOpenDate');
  if(!open) {
    return null;
  }
  return moment(open);
};
if(Meteor.isClient) {
  Template.registerHelper("getCompetitionRegistrationOpenMoment", function() {
    return getCompetitionRegistrationOpenMoment(this.competitionId);
  });
}

getCompetitionRegistrationCloseMoment = function(competitionId) {
  var close = getCompetitionAttribute(competitionId, 'registrationCloseDate');
  if(!close) {
    return null;
  }
  return moment(close);
};
if(Meteor.isClient) {
  Template.registerHelper("getCompetitionRegistrationCloseMoment", function() {
    return getCompetitionRegistrationCloseMoment(this.competitionId);
  });
}

getCompetitionNumberOfDays = function(competitionId) {
  var numberOfDays = getCompetitionAttribute(competitionId, 'numberOfDays');
  numberOfDays = parseInt(numberOfDays);
  return numberOfDays || 1;
};
if(Meteor.isClient) {
  Template.registerHelper("competitionNumberOfDays", function() {
    return getCompetitionNumberOfDays(this.competitionId);
  });
}

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
if(Meteor.isClient) {
  Template.registerHelper("competitionEvents", function() {
    return getCompetitionEvents(this.competitionId);
  });
}

getCompetitionCalendarStartMinutes = function(competitionId) {
  var calendarStartMinutes = getCompetitionAttribute(competitionId, 'calendarStartMinutes');
  calendarStartMinutes = calendarStartMinutes || 0;
  return calendarStartMinutes;
};
if(Meteor.isClient) {
  Template.registerHelper("competitionCalendarStartMinutes", function() {
    return getCompetitionCalendarStartMinutes(this.competitionId);
  });
}

getCompetitionCalendarEndMinutes = function(competitionId) {
  var calendarEndMinutes = getCompetitionAttribute(competitionId, 'calendarEndMinutes');
  calendarEndMinutes = calendarEndMinutes || 23.5*60;
  return calendarEndMinutes;
};
if(Meteor.isClient) {
  Template.registerHelper("competitionCalendarEndMinutes", function() {
    return getCompetitionCalendarEndMinutes(this.competitionId);
  });
}

if(Meteor.isClient) {
  Template.registerHelper("canManageCompetition", function(userId) {
    var cannotManageReason = getCannotManageCompetitionReason(userId, this.competitionId);
    return !cannotManageReason;
  });
}

isRegisteredForCompetition = function(userId, competitionId) {
  var competition = Registrations.findOne({
    competitionId: competitionId,
    userId: userId,
  },
    { fields: { _id: 1 } }
  );
  return !!competition;
};
if(Meteor.isClient) {
  Template.registerHelper("isRegisteredForCompetition", function(userId) {
    return isRegisteredForCompetition(userId, this.competitionId);
  });
}

minutesToPrettyTime = function(timeMinutes) {
  var duration = moment.duration(timeMinutes, 'minutes');
  var timeMoment = moment({
    hour: duration.hours(),
    minutes: duration.minutes(),
  });
  return timeMoment.format("h:mma");
};
if(Meteor.isClient) {
  Template.registerHelper("minutesToPrettyTime", function(timeMinutes) {
    return minutesToPrettyTime(timeMinutes);
  });
}

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

if(Meteor.isClient) {
  Template.registerHelper("formatMomentDate", function(m) {
    return formatMomentDate(m);
  });

  Template.registerHelper("formatMomentDateRange", function(startMoment, endMoment) {
    return formatMomentDateRange(startMoment, endMoment);
  });

  Template.registerHelper("formatMomentDateTime", function(m) {
    return formatMomentDateTime(m);
  });
}


getResultsWithUniqueNamesForRound = function(roundId, limit) {
  var results = Results.find({ roundId: roundId }, { limit: limit }).fetch();

  var competitionId = getRoundAttribute(roundId, 'competitionId');
  var eventCode = getRoundAttribute(roundId, 'eventCode');

  // Expand each result to also contain the uniqueName for that participant
  var registrations = Registrations.find({
    competitionId: competitionId,
    checkedInEvents: eventCode,
  },
    { fields: { uniqueName: 1 } }
  );
  var registrationById = {};
  registrations.forEach(function(registration) {
    registrationById[registration._id] = registration;
  });
  results.forEach(function(result) {
    var registration = registrationById[result.registrationId];
    if(!registration) {
      // The registration for this result may not have been found by our earlier
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
    title = wca.eventByCode[round.eventCode].name + ": " + wca.roundByCode[round.roundCode].name;
  } else {
    title = round.title;
  }

  return title;
};
if(Meteor.isClient) {
  Template.registerHelper("roundTitle", function(round) {
    return roundTitle(round);
  });
}
