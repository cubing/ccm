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

Template.registerHelper("competition", function(attribute){
  return getCompetitionAttribute(this.competitionId, attribute);
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
