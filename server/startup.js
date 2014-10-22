var url = Npm.require('url');

Meteor.startup(function(){
  // TODO - get a list of competitions somehow?
  // https://github.com/meteor/meteor/issues/1795
  var wcaCompetition = JSON.parse(Assets.getText("competitions/StarlightOpen2014.json"));

  var competition = {
    wcaCompetitionId: wcaCompetition.competitionId,
    competitors: [],
    staff: [],
    organizers: [],
    listed: false
  };
  Competitions.upsert(
    { wcaCompetitionId: competition.wcaCompetitionId },
    competition
  );
  var competitionId = Competitions.findOne(
    { wcaCompetitionId: competition.wcaCompetitionId }
  )._id;

  var userIdByJsonId = {};
  wcaCompetition.persons.forEach(function(wcaPerson, i){
    var userProfile = {
      name: wcaPerson.name,
      wcaId: wcaPerson.wcaId,
      countryId: wcaPerson.countryId,
      gender: wcaPerson.gender,
      dob: wcaPerson.dob
    };

    var user;
    if(wcaPerson.wcaId){
      //check for user with WCAID and if user doesn't exist we create one
      user = Meteor.users.findOne({username:userProfile.wcaId});
      if(!user){
        Accounts.createUser({username:userProfile.wcaId, password: userProfile.dob, profile: userProfile});
        user = Meteor.users.findOne({username:userProfile.wcaId});
      }
    } else {
      //create user if user doesn't exist and wcaId doesn't exist or look for one first
      var username = userProfile.name + i;
      user = Meteor.users.findOne({ username: username });
      if(!user){
        Accounts.createUser({ username: username, password: userProfile.dob, profile: userProfile });
        user = Meteor.users.findOne({ username: username });
      }
    }
    userIdByJsonId[wcaPerson.id] = user._id;
  });

  // Each competition contains a competitors attribute.
  // This is an array of objects, where each object represents a competitor.
  // This competitor object contains an _id field whose value is the _id of
  // a document in the User collection.
  var competitors = [];
  for(var jsonId in userIdByJsonId){
    if(userIdByJsonId.hasOwnProperty(jsonId)){
      var userId = userIdByJsonId[jsonId];
      competitors.push({
        _id: userId
      });
    }
  }
  Competitions.update(
    { _id: competitionId },
    { $set: { competitors: competitors } }
  );

  // Add all the rounds and results for this competition.
  // First remove any old rounds, results, and groups for this competition.
  Rounds.remove({ competitionId: competitionId });
  Results.remove({ competitionId: competitionId });
  Groups.remove({ competitionId: competitionId });
  wcaCompetition.events.forEach(function(wcaEvent){
    // Sort rounds according to the order in which they must have occurred.
    wcaEvent.rounds.sort(function(r1, r2){
      return ( wca.roundByCode[r1.roundId].supportedRoundIndex -
               wca.roundByCode[r2.roundId].supportedRoundIndex );
    });
    wcaEvent.rounds.forEach(function(wcaRound, nthRound){
      var roundInfo = wca.roundByCode[wcaRound.roundId];
      var round = {
        combined: roundInfo.combined,
        nthRound: nthRound,
        competitionId: competitionId,
        eventCode: wcaEvent.eventId,
        roundCode: wcaRound.roundId,
        formatCode: wcaRound.formatId,
      };
      var roundId = Rounds.insert(round);

      wcaRound.results.forEach(function(wcaResult){
        // wcaResult.personId refers to the personId in the wca json
        var userId = userIdByJsonId[wcaResult.personId];

        var result = {
          competitionId: competitionId,
          roundId: roundId,
          userId: userId,
          position: wcaResult.position,
          solves: wcaResult.results,
          best: wcaResult.best,
          average: wcaResult.average
        };
        Results.insert(result);
      });

      wcaRound.groups.forEach(function(wcaGroup){
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

  var organizer = Meteor.users.findOne({username: "2011SELZ01"});
  var competitionName = competition.wcaCompetitionId.replace(/([a-z])([A-Z0-9])/g, '$1 $2');
  Competitions.update(
    { wcaCompetitionId: competition.wcaCompetitionId },
    {
      $addToSet: { organizers: organizer._id },
      $set: { competitionName: competitionName }
    }
  );

  // Announce ourselves via Zeroconf
  var mdns = Meteor.npmRequire('mdns-js');

  // Wow, this is so gross. I couldn't find any way to get to
  // our "runner" though.
  // See https://github.com/meteor/meteor/blob/devel/tools/run-all.js#L344
  var port = url.parse(process.env.ROOT_URL).port;
  var service = new mdns.createAdvertisement(
      mdns.tcp('_http'),
      "" + port,
      {
        name: 'omega',
        txt: {
          txtvers: '1'
        }
      }
  );
  service.start();
});
