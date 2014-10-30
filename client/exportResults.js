Meteor.startup(function(){
  Session.set('exportResults-warnings', null);
});

Template.exportResultsModal.helpers({
  wcaResultsJson: function(){
    var competition = this;
    var wcaResults = exportWcaResultsObj(competition._id);
    var wcaResultsJson = JSON.stringify(wcaResults, undefined, 2);
    return wcaResultsJson;
  },
  warnings: function(){
    return Session.get("exportResults-warnings");
  }
});

function exportWcaResultsObj(competitionId){
  var warnings = [];

  var competition = Competitions.findOne({ _id: competitionId });
  if(!competition){
    return {};
  }
  var groups = Groups.find({ competitionId: competitionId }).fetch();
  var scramblePrograms = _.uniq(_.pluck(groups, "scrambleProgram"));
  if(scramblePrograms.length > 1){
    // TODO - more details
    warnings.push("Multiple scramble programs detected");
  }
  var scrambleProgram = scramblePrograms[0];

  var users = Meteor.users.find({
    _id: {
      $in: _.pluck(competition.competitors, "_id")
    }
  }).fetch();
  // TODO - compare this list of people to the people who *actually* competed
  var wcaPersons = _.map(users, function(user){
    var wcaPerson = {
      "id": user._id,
      "name": user.profile.name,
      "wcaId": user.profile.wcaId,
      "countryId": user.profile.countryId,
      "gender": user.profile.gender,
      "dob": user.profile.dob
    };
    return wcaPerson;
  });

  var wcaEvents = [];
  _.toArray(wca.eventByCode).forEach(function(e, i){
    var wcaRounds = [];
    Rounds.find({
      competitionId: competitionId,
      eventCode: e.code
    }).forEach(function(round){
      var wcaResults = [];
      Results.find({
        roundId: round._id
      }).forEach(function(result){
        var wcaResult = {
          personId: result.userId,
          position: result.position,
          results: result.solves,
          best: result.best,
          average: result.average
        };
        wcaResults.push(wcaResult);
      });

      var wcaGroups = [];
      Groups.find({
        roundId: round._id
      }).forEach(function(group){
        var wcaGroup = {
          group: group.group,
          scrambles: group.scrambles,
          extraScrambles: group.extraScrambles
        };
        wcaGroups.push(wcaGroup);
      });

      var wcaRound = {
        roundId: round.roundCode,
        formatId: round.formatCode,
        results: wcaResults,
        groups: wcaGroups
      };
      wcaRounds.push(wcaRound);
    });
    if(wcaRounds.length === 0){
      return;
    }
    var wcaEvent = {
      eventId: e.code,
      rounds: wcaRounds
    };
    wcaEvents.push(wcaEvent);
  });

  var wcaResults = {
    "formatVersion": "WCA Competition 0.2",
    "competitionId": competition.wcaCompetitionId,
    "persons": wcaPersons,
    "events": wcaEvents,
    "scrambleProgram": scrambleProgram
  };

  Session.set("exportResults-warnings", warnings);
  return wcaResults;
}
