Meteor.startup(function() {
  if(!process.env.GJCOMPS_DEVEL) {
    return;
  }

  // TODO - get a list of competitions somehow?
  // https://github.com/meteor/meteor/issues/1795
  var wcaCompetition = JSON.parse(Assets.getText("competitions/StarlightOpen2014.json"));

  var competition = Competitions.findOne({
    wcaCompetitionId: wcaCompetition.competitionId,
  });
  if(!competition) {
    var competitionId = Competitions.insert({
      competitionName: wcaCompetition.competitionId,
      wcaCompetitionId: wcaCompetition.competitionId,
      listed: false,
      startDate: new Date(),
      numberOfDays: 1,
      competitors: [],
      staff: [],
      organizers: [],
    });
    competition = Competitions.findOne({ _id: competitionId });
    assert(competition);
  }

  var userIdByJsonId = {};
  wcaCompetition.persons.forEach(function(wcaPerson, i) {
    var userProfile = {
      name: wcaPerson.name,
      wcaId: wcaPerson.wcaId,
      countryId: wcaPerson.countryId,
      gender: wcaPerson.gender,
      dob: wcaPerson.dob
    };

    var user;
    if(wcaPerson.wcaId) {
      // Check for user with WCAID and if user doesn't exist we create one
      user = Meteor.users.findOne({ username: userProfile.wcaId });
      if(!user) {
        Accounts.createUser({
          username: userProfile.wcaId,
          password: '',
          profile: userProfile
        });
        user = Meteor.users.findOne({ username: userProfile.wcaId });
        assert(user);
      }
    } else {
      // Create user if user doesn't exist and wcaId doesn't exist or look for one first
      var username = userProfile.name + i;
      user = Meteor.users.findOne({ username: username });
      if(!user) {
        Accounts.createUser({
          username: username,
          password: '',
          profile: userProfile
        });
        user = Meteor.users.findOne({ username: username });
        assert(user);
      }
    }
    userIdByJsonId[wcaPerson.id] = user._id;
  });

  // Each competition contains a competitors attribute.
  // This is an array of objects, where each object represents a competitor.
  // This competitor object contains an _id field whose value is the _id of
  // a document in the User collection.
  var competitors = [];
  for(var jsonId in userIdByJsonId) {
    if(userIdByJsonId.hasOwnProperty(jsonId)) {
      var userId = userIdByJsonId[jsonId];
      competitors.push({
        _id: userId
      });
    }
  }
  Competitions.update(
    { _id: competition._id },
    { $set: { competitors: competitors } }
  );

  // Add all the rounds and results for this competition.
  // First remove any old rounds, results, and groups for this competition.
  Rounds.remove({ competitionId: competition._id });
  Results.remove({ competitionId: competition._id });
  Groups.remove({ competitionId: competition._id });
  wcaCompetition.events.forEach(function(wcaEvent) {
    // Sort rounds according to the order in which they must have occurred.
    wcaEvent.rounds.sort(function(r1, r2) {
      return ( wca.roundByCode[r1.roundId].supportedRoundIndex -
               wca.roundByCode[r2.roundId].supportedRoundIndex );
    });
    wcaEvent.rounds.forEach(function(wcaRound, nthRound) {
      var roundInfo = wca.roundByCode[wcaRound.roundId];
      var roundId = Rounds.insert({
        combined: roundInfo.combined,
        nthRound: nthRound,
        competitionId: competition._id,
        eventCode: wcaEvent.eventId,
        roundCode: wcaRound.roundId,
        formatCode: wcaRound.formatId,
        status: wca.roundStatuses.closed,
      });

      wcaRound.results.forEach(function(wcaResult) {
        // wcaResult.personId refers to the personId in the wca json
        var userId = userIdByJsonId[wcaResult.personId];
        Results.insert({
          competitionId: competition._id,
          roundId: roundId,
          userId: userId,
          position: wcaResult.position,
          solves: wcaResult.results,
          best: wcaResult.best,
          average: wcaResult.average
        });
      });

      wcaRound.groups.forEach(function(wcaGroup) {
        Groups.insert({
          competitionId: competition._id,
          roundId: roundId,
          group: wcaGroup.group,
          scrambles: wcaGroup.scrambles,
          extraScrambles: wcaGroup.extraScrambles,
          scrambleProgram: wcaCompetition.scrambleProgram
        });
      });
    });
  });
});
