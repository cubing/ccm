if(Meteor.isServer) {
  Meteor.startup(function() {
    // TODO - get a list of competitions somehow?
    // https://github.com/meteor/meteor/issues/1795
    var wcaCompetition = JSON.parse(Assets.getText("competitions/StarlightOpen2014.json"));

    var competition = {
      wcaCompetitionId: wcaCompetition.competitionId,
      people: [],
      staff: [],
      organizers: []
    };
    Competitions.upsert(
      { wcaCompetitionId: competition.wcaCompetitionId },
      competition
    );
    var competitionId = Competitions.findOne(
      { wcaCompetitionId: competition.wcaCompetitionId }
    )._id;

    var personIdByJsonId = {};
    wcaCompetition.persons.forEach(function(wcaPerson) {
      var person = {
        name: wcaPerson.name,
        wcaId: wcaPerson.wcaId,
        countryId: wcaPerson.countryId,
        gender: wcaPerson.gender,
        dob: wcaPerson.dob
      };

      var personId;
      if(wcaPerson.wcaId) {
        // Clobber any existing document with this wcaId.
        People.upsert(
          { wcaId: wcaPerson.wcaId },
          person
        );
        personId = People.findOne(
          { wcaId: wcaPerson.wcaId }
        )._id;
      } else {
        // If this person doesn't have a wca id, then we want to create a new
        // document.
        personId = People.insert(person);
      }
      personIdByJsonId[wcaPerson.id] = personId;
    });

    // Each competition contains a people attribute.
    // This is an array of objects, where each object represents a person.
    // This person object contains an _id field whose value is the _id of
    // a document in the People collection.
    var people = [];
    for(var jsonId in personIdByJsonId) {
      if(personIdByJsonId.hasOwnProperty(jsonId)) {
        var personId = personIdByJsonId[jsonId];
        people.push({
          _id: personId
        });
      }
    }
    Competitions.update(
      { _id: competitionId },
      { $set: { people: people } }
    );

    // Add all the rounds and results for this competition.
    // First remove any old rounds, results, and groups for this competition.
    Rounds.remove({ competitionId: competitionId });
    Results.remove({ competitionId: competitionId });
    Groups.remove({ competitionId: competitionId });
    wcaCompetition.events.forEach(function(wcaEvent) {
      wcaEvent.rounds.forEach(function(wcaRound) {
        var round = {
          competitionId: competitionId,
          eventCode: wcaEvent.eventId,
          roundCode: wcaRound.roundId,
          formatCode: wcaRound.formatId
        };
        var roundId = Rounds.insert(round);

        wcaRound.results.forEach(function(wcaResult) {
          // wcaResult.personId refers to the personId in the wca json
          var personId = personIdByJsonId[wcaResult.personId];

          var result = {
            competitionId: competitionId,
            roundId: roundId,
            personId: personId,
            position: wcaResult.position,
            solves: wcaResult.results,
            best: wcaResult.best,
            average: wcaResult.average
          };
          Results.insert(result);
        });

        wcaRound.groups.forEach(function(wcaGroup) {
          var group = {
            competitionId: competitionId,
            roundId: roundId,
            group: wcaGroup.group,
            scrambles: wcaGroup.scrambles,
            extraScrambles: wcaGroup.extraScrambles
          };
          Groups.insert(group);
        });
      });
    });

  });
}
