if(Meteor.isClient) {
  Template.registerHelper("roundName", function(roundCode) {
    return wca.roundByCode[roundCode].name;
  });
  Template.registerHelper("eventName", function(eventCode) {
    return wca.eventByCode[eventCode].name;
  });
  Template.registerHelper("eventIcon", function(eventCode) {
    return "/img/" + eventCode + ".svg";
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
    return Meteor.user().profile.siteAdmin;
  });

  Template.registerHelper("toAtMostFixed", function(n, fixed) {
    // Neat trick from http://stackoverflow.com/a/18358056
    return +(n.toFixed(fixed));
  });
  Template.registerHelper("percentage", function(a, b) {
    if(_.isArray(a)) {
      b = a[1];
      a = a[0];
    }
    if(b === 0) {
      return 0;
    }
    return Math.round(100.0 * a / b);
  });
}

clockFormat = function(solveTime, isAverage) {
  if(!solveTime) {
    // solveTime is undefined when no data has been entered yet.
    return "";
  }
  if(solveTime.wcaValue === 0) {
    // A wcaValue of 0 means "nothing happened here", so we just show an
    // empty string, rather than something like "0.00" which would look like
    // clutter.
    return "";
  }
  if(solveTime.moveCount) {
    // jChester's solveTimeToStopwatchFormat doesn't handle FMC, which is fine,
    // FMC is *weird*.
    if(isAverage) {
      // The average field for FMC is bizarre:
      // it's the average times 100 rounded to the nearest integer.
      return (solveTime.moveCount / 100).toFixed(2);
    } else {
      return "" + solveTime.moveCount;
    }
  }
  return $.solveTimeToStopwatchFormat(solveTime);
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
    // default to a future date; we don't want people signing
    // up before things are ready.
    return getCompetitionStartDateMoment(competitionId).subtract(2, 'days').hours(23).minutes(59).seconds(59);
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
    // default to at least a day before the competition.
    // 11:59 PM is less confusing than 12:00 AM.
    return getCompetitionStartDateMoment(competitionId).subtract(2, 'days').hours(23).minutes(59).seconds(59);
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
  var rounds = Rounds.find({
    competitionId: competitionId,
  }, {
    fields: {
      eventCode: 1,
    }
  }).fetch();

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
  }, {
    fields: {
      _id: 1,
    }
  });
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
    sort: {
      "nthRound": -1
    },
    fields: {
      _id: 1
    }
  });
  if(!lastRoundForEvent) {
    return null;
  }
  return lastRoundForEvent._id;
};

if(Meteor.isClient) {
  Template.registerHelper("formatMomentDateRange", function(startMoment, endMoment) {
    var formatStr = "MMMM D, YYYY";
    var rangeStr = $.fullCalendar.formatRange(startMoment, endMoment, formatStr);
    return rangeStr;
  });
  Template.registerHelper("formatMomentTime", function(m) {
    return m.format("dddd, MMMM Do YYYY, h:mm:ss a");
  });
}
