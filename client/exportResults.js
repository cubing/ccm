var exportProblems = new ReactiveVar(null);

Template.exportResults.helpers({
  wcaResultsJson: function() {
    var competition = this.competition;
    var wcaResults = exportWcaResultsObj(this.competitionId, this.competitionUrlId);
    var wcaResultsJson = JSON.stringify(wcaResults, undefined, 2);
    return wcaResultsJson;
  },
  problems: function() {
    return exportProblems.get();
  }
});

function exportWcaResultsObj(competitionId, competitionUrlId) {
  var problems = [];

  var uploadScramblesRoute = Router.routes.uploadScrambles;
  var uploadScramblesPath = uploadScramblesRoute.path({ competitionUrlId: competitionUrlId });

  var groups = Groups.find({ competitionId: competitionId }).fetch();
  var scramblePrograms = _.uniq(_.pluck(groups, "scrambleProgram"));
  if(scramblePrograms.length > 1) {
    // TODO - more details
    problems.push({
      warning: true,
      message: "Multiple scramble programs detected",
      fixUrl: uploadScramblesPath
    });
  }
  var scrambleProgram = scramblePrograms[0];

  var competitors = Registrations.find({
    competitionId: competitionId,
  }, {
    userId: 1,
  }).fetch();
  var users = Meteor.users.find({
    _id: {
      $in: _.pluck(competitors, "userId")
    }
  }).fetch();
  // TODO - compare this list of people to the people who *actually* competed
  var wcaPersons = _.map(users, function(user) {
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
  _.toArray(wca.eventByCode).forEach(function(e, i) {
    var wcaRounds = [];
    Rounds.find({
      competitionId: competitionId,
      eventCode: e.code
    }).forEach(function(round) {
      var wcaResults = [];
      Results.find({
        roundId: round._id
      }).forEach(function(result) {
        var wcaValues = _.pluck(result.solves, 'wcaValue');
        var wcaResult = {
          personId: result.userId,
          position: result.position,
          results: wcaValues,
          best: result.best.wcaValues,
          average: result.average.wcaValues,
        };
        wcaResults.push(wcaResult);
      });

      var wcaGroups = [];
      Groups.find({
        roundId: round._id
      }).forEach(function(group) {
        var wcaGroup = {
          group: group.group,
          scrambles: group.scrambles,
          extraScrambles: group.extraScrambles
        };
        wcaGroups.push(wcaGroup);
      });
      if(wcaGroups.length === 0) {
        problems.push({
          error: true,
          message: "No scramble groups found for " + e.code +
                   " " + wca.roundByCode[ round.roundCode ].name,
          fixUrl: uploadScramblesPath
        });
      }

      var wcaRound = {
        roundId: round.roundCode,
        formatId: round.formatCode,
        results: wcaResults,
        groups: wcaGroups
      };
      wcaRounds.push(wcaRound);
    });
    if(wcaRounds.length === 0) {
      return;
    }
    var wcaEvent = {
      eventId: e.code,
      rounds: wcaRounds
    };
    wcaEvents.push(wcaEvent);
  });

  var wcaCompetitionId = getCompetitionAttribute(competitionId, 'wcaCompetitionId');
  var wcaResults = {
    "formatVersion": "WCA Competition 0.2",
    "competitionId": wcaCompetitionId,
    "scrambleProgram": scrambleProgram,
    "persons": wcaPersons,
    "events": wcaEvents
  };

  exportProblems.set(problems);
  return wcaResults;
}
