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

  Template.registerHelper("isSiteAdmin", function() {
    return Meteor.user().profile.siteAdmin;
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

getCompetitionRegistrationOpenMoment = function(competitionId) {
  var open = getCompetitionAttribute(competitionId, 'registrationOpenDate');
  if(!open) {
    return null;
  }
  return moment(open);
};

getCompetitionRegistrationCloseMoment = function(competitionId) {
  var close = getCompetitionAttribute(competitionId, 'registrationCloseDate');
  if(!close) {
    return null;
  }
  return moment(close);
};

getCompetitionEndDateMoment = function(competitionId) {
  var startDate = getCompetitionAttribute(competitionId, 'startDate');
  if(!startDate) {
    return null;
  }
  startDate = moment(startDate);
  var numberOfDays = getCompetitionAttribute(competitionId, 'numberOfDays');
  var endDate = startDate.clone().add(numberOfDays - 1, 'days').subtract(1);
  return endDate;
};
if(Meteor.isClient) {
  Template.registerHelper("competitionEndDateMoment", function() {
    return getCompetitionEndDateMoment(this.competitionId);
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
  var events = _.chain(wca.eventByCode)
    .toArray()
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
  var competition = Competitions.findOne({
    _id: competitionId,
    'competitors._id': userId,
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
  Template.registerHelper("formatMomentRange", function(startMoment, endMoment) {
    var formatStr = "MMMM D, YYYY";
    var rangeStr = $.fullCalendar.formatRange(startMoment, endMoment, formatStr);
    return rangeStr;
  });
}
