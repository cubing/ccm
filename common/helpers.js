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

  Template.registerHelper("isSiteAdmin", function() {
    return Meteor.user().profile.siteAdmin;
  });

  Template.registerHelper("clockFormat", function(solveTime) {
    var millis = solveTime.millis;
    var minutesField = Math.floor(millis / (60*1000));
    millis %= (60*1000);

    var secondsField = Math.floor(millis / 1000);
    millis %= 1000;

    function pad(toPad, padVal, minLength) {
      var padded = toPad + "";
      while(padded.length < minLength) {
        padded = padVal + padded;
      }
      return padded;
    }

    var clockFormat = minutesField + ":" + pad(secondsField, "0", 2);
    var decimals = solveTime.decimals;
    if(decimals > 0) {
      // It doesn't make sense to format to more decimal places than the
      // accuracy we have.
      decimals = Math.min(3, decimals);
      var millisStr = pad(millis, "0", 3);
      clockFormat += ".";
      for(var i = 0; i < decimals; i++) {
        clockFormat += millisStr.charAt(i);
      }
    }
    return clockFormat;
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
  var endDate = startDate.clone().add(numberOfDays - 1, 'days');
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
