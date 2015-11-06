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
  let competition = Competitions.findOne(this.competitionId);
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

isRegisteredForCompetition = function(userId, competitionId) {
  let competition = Registrations.findOne({
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
  let duration = moment.duration(timeMinutes, 'minutes');
  let timeMoment = moment({
    hour: duration.hours(),
    minutes: duration.minutes(),
  });
  return timeMoment.format("h:mma");
};
register("minutesToPrettyTime", function(timeMinutes) {
  return minutesToPrettyTime(timeMinutes);
});

getLastRoundIdForEvent = function(competitionId, eventCode) {
  let lastRoundForEvent = Rounds.findOne({
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

const LOCAL_TIMEZONE = jstz.determine().name();

const DATE_FORMAT = "LL";
const ISO_DATE_FORMAT = "YYYY-MM-DD";
const DATETIME_FORMAT = "LLLL z";

formatMomentDate = function(m) {
  return m.utc().format(DATE_FORMAT);
};

formatMomentDateIso8601 = function(m) {
  let iso8601Date = m.utc().format(ISO_DATE_FORMAT);
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
