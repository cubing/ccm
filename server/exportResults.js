const log = logging.handle("server_exportResults");

Meteor.methods({
  exportWcaResults: function exportWcaResults(competitionId, competitionUrlId) {
    log.l0("exportWcaResults start");
    let problems = [];

    let uploadScramblesRoute = Router.routes.uploadScrambles;
    let uploadScramblesPath = uploadScramblesRoute.path({ competitionUrlId: competitionUrlId });

    let groups = Groups.find({ competitionId: competitionId }).fetch();
    let scramblePrograms = _.uniq(_.pluck(groups, "scrambleProgram"));
    if(scramblePrograms.length > 1) {
      // TODO - more details
      problems.push({
        warning: true,
        message: "Multiple scramble programs detected",
        fixUrl: uploadScramblesPath
      });
    }
    let scrambleProgram = scramblePrograms[0];

    let registrationById = _.indexBy(Registrations.find({ competitionId: competitionId }).fetch(), '_id');
    let wcaPersonByRegistrationId = {};
    var registrationToWcaPerson = (registration) => {
      let iso8601Date = formatMomentDateIso8601(moment(registration.dob));
      let wcaPerson = {
        "id": registration._id,
        "name": registration.uniqueName,
        "wcaId": registration.wcaId,
        "countryId": registration.countryId,
        "gender": registration.gender,
        "dob": iso8601Date,
      };
      return wcaPerson;
    };

    let wcaEvents = [];
    _.toArray(wca.eventByCode).forEach((e, i) => {
      let wcaRounds = [];
      Rounds.find({
        competitionId: competitionId,
        eventCode: e.code
      }).forEach(round => {
        let wcaResults = [];
        let everyoneMadeCutoff = true;
        Results.find({
          roundId: round._id,
	  noShow: { $ne: true },
        }).forEach(result => {
          let wcaPerson = wcaPersonByRegistrationId[result.registrationId];
          if(!wcaPerson) {
            wcaPerson = registrationToWcaPerson(registrationById[result.registrationId]);
            wcaPersonByRegistrationId[result.registrationId] = wcaPerson;
          }
          let wcaValues = _.map(result.solves, wca.solveTimeToWcaValue);

          // The WCA expects cutoff solves to show up as 0s.
          while(wcaValues.length < round.format().count) {
            everyoneMadeCutoff = false;
            wcaValues.push(0);
          }

          let roundDataEntryPath = Router.routes.dataEntry.path({
            competitionUrlId: competitionUrlId,
            eventCode: round.eventCode,
            nthRound: round.nthRound,
          });
          if(!result.hasOwnProperty('bestIndex') || !wcaValues[result.bestIndex]) {
            problems.push({
              warning: true,
              message: `Incorrect best for result: ${result._id}`,
              fixUrl: roundDataEntryPath,
            });
            return;
          }

          let wcaAverage = wca.solveTimeToWcaValue(result.average);
          let wcaResult = {
            personId: wcaPerson.id,
            position: result.position,
            results: wcaValues,
            best: wcaValues[result.bestIndex],
            average: wcaAverage,
          };
          wcaResults.push(wcaResult);
        });

        // The WCA does not consider a round "combined" if everyone made the soft cutoff.
        // Note that we're not writing to the database here, because I think it makes sense
        // to store the cutoff information, even if everyone made the cutoff.
        if(everyoneMadeCutoff && round.softCutoff) {
          round.softCutoff = null;
        }

        let wcaGroups = [];
        Groups.find({ roundId: round._id }).forEach(group => {
          let wcaGroup = {
            group: group.group,
            scrambles: group.scrambles,
            extraScrambles: group.extraScrambles
          };
          wcaGroups.push(wcaGroup);
        });
        if(wcaGroups.length === 0) {
          problems.push({
            error: true,
            message: "No scramble groups found for " + e.code + " " + round.properties().name,
            fixUrl: uploadScramblesPath
          });
        }

        let wcaRound = {
          roundId: round.roundCode(),
          formatId: round.formatCode,
          results: wcaResults,
          groups: wcaGroups
        };
        wcaRounds.push(wcaRound);
      });
      if(wcaRounds.length === 0) {
        return;
      }
      let wcaEvent = {
        eventId: e.code,
        rounds: wcaRounds
      };
      wcaEvents.push(wcaEvent);
    });

    let wcaResults = {
      "formatVersion": "WCA Competition 0.3",
      "resultsProgram": "CCM",
      "competitionId": Competitions.findOne(competitionId).wcaCompetitionId,
      "scrambleProgram": scrambleProgram,
      "persons": _.values(wcaPersonByRegistrationId),
      "events": wcaEvents
    };

    log.l0("exportWcaResults done!");
    return {
      wcaResults: wcaResults,
      exportProblems: problems,
    };
  },
});
