Meteor.startup(function() {
  if(!process.env.GJCOMPS_DEVEL) {
    return;
  }

  // TODO - get a list of competitions somehow?
  // https://github.com/meteor/meteor/issues/1795
  var wcaCompetition = JSON.parse(Assets.getText("competitions/USNationals2014.json"));

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
      staff: [],
      organizers: [],
    });
    competition = Competitions.findOne({ _id: competitionId });
    assert(competition);
  }

  var userInfoByJsonId = {};
  wcaCompetition.persons.forEach(function(wcaPerson, i) {
    var dobMoment = moment.utc(wcaPerson.dob);
    var userProfile = {
      name: wcaPerson.name,
      wcaId: wcaPerson.wcaId,
      countryId: wcaPerson.countryId,
      gender: wcaPerson.gender,
      dob: dobMoment.toDate(),
      siteAdmin: false,
    };

    var user, email, userId;
    if(wcaPerson.wcaId) {
      // Check for user with WCAID and if user doesn't exist we create one
      email = userProfile.wcaId + "@gjcomps.com";
      user = Meteor.users.findOne({ "emails.address": email });
      if(!user) {
        userId = Accounts.createUser({
          email: email,
          password: '',
          profile: userProfile
        });
        user = Meteor.users.findOne({ _id: userId });
        assert(user);
      }
    } else {
      // Create user if user doesn't exist and wcaId doesn't exist or look for one first
      email = (userProfile.name.replace(/\s/g, "_") + i) + "@gjcomps.com";
      user = Meteor.users.findOne({ "emails.address": email });
      if(!user) {
        userId = Accounts.createUser({
          email: email,
          password: '',
          profile: userProfile
        });
        user = Meteor.users.findOne({ _id: userId });
        assert(user);
      }
    }
    userInfoByJsonId[wcaPerson.id] = {
      userId: user._id,
      events: [],
    };
  });

  // Add all the rounds, results, and registrations for this competition.
  // First remove any old rounds, results, registrations, and groups for this competition.
  Rounds.remove({ competitionId: competition._id });
  Results.remove({ competitionId: competition._id });
  Groups.remove({ competitionId: competition._id });
  Registrations.remove({ competitionId: competition._id });

  // Add data for rounds, results, and groups
  wcaCompetition.events.forEach(function(wcaEvent) {
    // Sort rounds according to the order in which they must have occurred.
    wcaEvent.rounds.sort(function(r1, r2) {
      return ( wca.roundByCode[r1.roundId].supportedRoundIndex -
               wca.roundByCode[r2.roundId].supportedRoundIndex );
    });
    wcaEvent.rounds.forEach(function(wcaRound, nthRound) {
      var roundInfo = wca.roundByCode[wcaRound.roundId];
      var roundId = Rounds.insert({
        nthRound: nthRound + 1,
        competitionId: competition._id,
        eventCode: wcaEvent.eventId,
        roundCode: wcaRound.roundId,
        formatCode: wcaRound.formatId,
        status: wca.roundStatuses.closed,
      });

      wcaRound.results.forEach(function(wcaResult) {
        // wcaResult.personId refers to the personId in the wca json
        var userInfo = userInfoByJsonId[wcaResult.personId];
        assert(userInfo);
        if(!_.contains(userInfo.events, wcaEvent.eventId)) {
          userInfo.events.push(wcaEvent.eventId);
        }
        var solves = _.map(wcaResult.results, function(wcaValue) {
          return wca.valueToSolveTime(wcaValue, wcaEvent.eventId);
        });
        Results.insert({
          competitionId: competition._id,
          roundId: roundId,
          userId: userInfo.userId,
          position: wcaResult.position,
          solves: solves,
          best: wca.valueToSolveTime(wcaResult.best, wcaEvent.eventId),
          average: wca.valueToSolveTime(wcaResult.average, wcaEvent.eventId),
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

  // Add registrations for people as documents in the registrations collection.
  // Each document in registrations contains a competitionId and userId field
  // whose values are the _id values of documents in the Competitions and Users
  // collections.
  for(var jsonId in userInfoByJsonId) {
    if(userInfoByJsonId.hasOwnProperty(jsonId)) {
      var userInfo = userInfoByJsonId[jsonId];
      Registrations.insert({
        competitionId: competition._id,
        userId: userInfo.userId,
        events: userInfo.events,
      });
    }
  }

});
