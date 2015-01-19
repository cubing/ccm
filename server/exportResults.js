var log = logging.handle("server_exportResults");


Meteor.methods({
  exportWcaResults: function exportWcaResults(competitionId, competitionUrlId) {
    log.l0("exportWcaResults start");
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

    var registrations = Registrations.find({
      competitionId: competitionId,
    }).fetch();
    // TODO - compare this list of people to the people who *actually* competed
    var wcaPersons = _.map(registrations, function(registration) {
      var iso8601Date = formatMomentDateIso8601(moment(registration.dob));
      var wcaPerson = {
        "id": registration._id,
        "name": registration.uniqueName,
        "wcaId": registration.wcaId,
        "countryId": registration.countryId,
        "gender": registration.gender,
        "dob": iso8601Date,
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

          var roundDataEntryPath = Router.routes.dataEntry.path({
            competitionUrlId: competitionUrlId,
            eventCode: round.eventCode,
            nthRound: round.nthRound,
          });
          if(!result.best) {
            problems.push({
              warning: true,
              message: "Incorrect best for result",
              fixUrl: roundDataEntryPath,
            });
            return;
          }
          if(!result.average) {
            problems.push({
              warning: true,
              message: "Incorrect average for result",
              fixUrl: roundDataEntryPath,
            });
            return;
          }
          var wcaResult = {
            personId: result.userId,
            position: result.position,
            results: wcaValues,
            best: result.best.wcaValue,
            average: result.average.wcaValue,
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

    log.l0("exportWcaResults done!");
    return {
      wcaResults: wcaResults,
      exportProblems: problems,
    };
  },
});
