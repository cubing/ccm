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

getCompetitionStartDateMoment = function(competitionId) {
  var startDate = getCompetitionAttribute(competitionId, 'startDate');
  if(!startDate) {
    return null;
  }
  return moment(startDate);
};
Template.registerHelper("competitionStartDateMoment", function() {
  return getCompetitionStartDateMoment(this.competitionId);
});

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
Template.registerHelper("competitionEndDateMoment", function() {
  return getCompetitionEndDateMoment(this.competitionId);
});

getCompetitionNumberOfDays = function(competitionId) {
  var numberOfDays = getCompetitionAttribute(competitionId, 'numberOfDays');
  numberOfDays = parseInt(numberOfDays);
  return numberOfDays || 1;
};
Template.registerHelper("competitionNumberOfDays", function() {
  return getCompetitionNumberOfDays(this.competitionId);
});

getCompetitionCalendarStartMinutes = function(competitionId) {
  var calendarStartMinutes = getCompetitionAttribute(competitionId, 'calendarStartMinutes');
  calendarStartMinutes = calendarStartMinutes || 0;
  return calendarStartMinutes;
};

getCompetitionCalendarEndMinutes = function(competitionId) {
  var calendarEndMinutes = getCompetitionAttribute(competitionId, 'calendarEndMinutes');
  calendarEndMinutes = calendarEndMinutes || 23.5*60;
  return calendarEndMinutes;
};

Template.registerHelper("competitionListed", function() {
  return getCompetitionAttribute(this.competitionId, 'listed');
});
Template.registerHelper("competitionCalendarStartMinutes", function() {
  return getCompetitionCalendarStartMinutes(this.competitionId);
});
Template.registerHelper("competitionCalendarEndMinutes", function() {
  return getCompetitionCalendarEndMinutes(this.competitionId);
});

Template.registerHelper("canManageCompetition", function(userId) {
  var cannotManageReason = getCannotManageCompetitionReason(this.competitionId, userId);
  return !!cannotManageReason;
});

minutesToPrettyTime = function(timeMinutes) {
  var duration = moment.duration(timeMinutes, 'minutes');
  var timeMoment = moment({
    hour: duration.hours(),
    minutes: duration.minutes(),
  });
  return timeMoment.format("h:mma");
};
Template.registerHelper("minutesToPrettyTime", function(timeMinutes) {
  return minutesToPrettyTime(timeMinutes);
});

Template.registerHelper("formatMomentRange", function(startMoment, endMoment) {
  var formatStr = "MMMM D, YYYY";
  var rangeStr = $.fullCalendar.formatRange(startMoment, endMoment, formatStr);
  return rangeStr;
});
