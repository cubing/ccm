Competitions = new Meteor.Collection("competitions");
Rounds = new Meteor.Collection("rounds");
Results = new Meteor.Collection("results");
Groups = new Meteor.Collection("groups");

var getDocumentAttribute = function(Collection, id, attribute) {
  var fields = {};
  fields[attribute] = 1;
  var doc = Collection.findOne({
    _id: id
  }, {
    fields: fields
  });
  attribute.split(".").forEach(function(attr) {
    doc = doc[attr];
  });
  return doc;
};

getCompetitionAttribute = function(competitionId, attribute) {
  return getDocumentAttribute(Competitions, competitionId, attribute);
};

getUserAttribute = function(userId, attribute) {
  return getDocumentAttribute(Meteor.users, userId, attribute);
};

getRoundAttribute = function(roundId, attribute) {
  return getDocumentAttribute(Rounds, roundId, attribute);
};
