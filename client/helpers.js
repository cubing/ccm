Template.registerHelper("roundName", function(roundCode){
  return wca.roundByCode[roundCode].name;
});
Template.registerHelper("eventName", function(eventCode){
  return wca.eventByCode[eventCode].name;
});
Template.registerHelper("eventIcon", function(eventCode){
  return "/img/" + eventCode + ".svg";
});
Template.registerHelper("formatName", function(formatCode){
  return wca.formatByCode[formatCode].name;
});

var getDocumentAttribute = function(Collection, id, attribute){
  var fields = {};
  fields[attribute] = 1;
  var doc = Collection.findOne({
    _id: id
  }, {
    fields: fields
  });
  return doc[attribute];
};
getCompetitionAttribute = function(competitionId, attribute){
  return getDocumentAttribute(Competitions, competitionId, attribute);
};
getRoundAttribute = function(roundId, attribute){
  return getDocumentAttribute(Rounds, roundId, attribute);
};

getCompetitionNumberOfDays = function(competitionId) {
  var numberOfDays = getCompetitionAttribute(competitionId, 'numberOfDays');
  numberOfDays = parseInt(numberOfDays);
  return numberOfDays || 1;
};

getCompetitionStartTime = function(competitionId) {
  var startTime = getCompetitionAttribute(competitionId, 'startTime');
  startTime = startTime || 0;
  return startTime;
};

getCompetitionEndTime = function(competitionId) {
  var endTime = getCompetitionAttribute(competitionId, 'endTime');
  endTime = endTime || 0;
  return endTime;
};

Template.registerHelper("competition", function(attribute){
  return getCompetitionAttribute(this.competitionId, attribute);
});
Template.registerHelper("competitionListed", function() {
  return getCompetitionAttribute(this.competitionId, 'listed');
});
Template.registerHelper("competitionNumberOfDays", function() {
  return getCompetitionNumberOfDays(this.competitionId);
});
Template.registerHelper("competitionStartTime", function() {
  return getCompetitionStartTime(this.competitionId);
});
Template.registerHelper("competitionEndTime", function() {
  return getCompetitionEndTime(this.competitionId);
});
prettyTimeFromMinutes = function(timeMinutes) {
  var duration = moment.duration(timeMinutes, 'minutes');
  var timeMoment = moment({
    hour: duration.hours(),
    minutes: duration.minutes(),
  });
  return timeMoment.format("h:mma");
};
Template.registerHelper("competitionStartTimePretty", function() {
  var timeMinutes = getCompetitionStartTime(this.competitionId);
  return prettyTimeFromMinutes(timeMinutes);
});
Template.registerHelper("competitionEndTimePretty", function() {
  var timeMinutes = getCompetitionEndTime(this.competitionId);
  return prettyTimeFromMinutes(timeMinutes);
});

Template.registerHelper("roundEventCode", function(){
  return getRoundAttribute(this.roundId, 'eventCode');
});
Template.registerHelper("roundRoundCode", function(){
  return getRoundAttribute(this.roundId, 'roundCode');
});
Template.registerHelper("roundFormatCode", function(){
  return getRoundAttribute(this.roundId, 'formatCode');
});

Template.registerHelper("isOrganizer", function(user){
  var competition = Competitions.findOne({
    _id: this.competitionId
  }, {
    fields: {
      organizers: 1
    }
  });
  return _.contains(competition.organizers, user._id);
});
Template.registerHelper("isStaff", function(roundCode){
  var competition = Competitions.findOne({
    _id: this.competitionId
  }, {
    fields: {
      staff: 1
    }
  });
  return _.contains(competition.staff, user._id);
});
