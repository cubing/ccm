var getCompetitions = function() {
  return Competitions.find(
    {},
    { fields: { wcaCompetitionId: 1, competitionName: 1, organizers: 1, listed: 1 } }
  );
};
Meteor.publish('competitions', function() {
  return getCompetitions();
});

HTTP.publish({collection: Competitions}, function(data) {
  return getCompetitions();
});

function competitionUrlIdToId(competitionUrlId) {
  var competition = Competitions.findOne({
    $or: [
      { _id: competitionUrlId },
      { wcaCompetitionId: competitionUrlId },
    ]
  }, {
    fields: {
      _id: 1,
    }
  });
  if(!competition) {
    return null;
  }
  return competition._id;
}

Meteor.publish('competition', function(competitionUrlId) {
  check(competitionUrlId, String);
  var competitionId = competitionUrlIdToId(competitionUrlId);
  if(!competitionId) {
    return [];
  }
  return [
    Competitions.find({ _id: competitionId }),
    Rounds.find({ competitionId: competitionId }),
  ];
});

Meteor.publish('competitionUsers', function(competitionUrlId) {
  check(competitionUrlId, String);
  var competitionId = competitionUrlIdToId(competitionUrlId);
  if(!competitionId) {
    return [];
  }
  return [
    Registrations.find({ competitionId: competitionId }),
    Meteor.users.find({
      // https://github.com/jfly/gjcomps/issues/71
      //_id: {
        //$in: _.pluck(registrations, "userId")
      //}
    }, {
      fields: {
        _id: 1,
        username: 1,
        "profile.name": 1,
        "profile.wcaId": 1,
        "profile.countryId": 1,
        "profile.gender": 1,
        "profile.dob": 1,
      }
    })
  ];
});

Meteor.publish('competitionResults', function(competitionUrlId) {
  check(competitionUrlId, String);
  var competitionId = competitionUrlIdToId(competitionUrlId);
  if(!competitionId) {
    return [];
  }
  return [
    Results.find({ competitionId: competitionId }),
  ];
});

Meteor.publish('roundResults', function(competitionUrlId, eventCode, nthRound) {
  check(competitionUrlId, String);
  check(eventCode, String);
  check(nthRound, Number);
  var competitionId = competitionUrlIdToId(competitionUrlId);
  if(!competitionId) {
    return [];
  }
  var round = Rounds.findOne({
    competitionId: competitionId,
    eventCode: eventCode,
    nthRound: nthRound,
  }, {
    fields: {
      _id: 1,
    }
  });
  return [
    Results.find({
      roundId: round._id,
    }),
  ];
});

Meteor.publish('competitionScrambles', function(competitionUrlId) {
  check(competitionUrlId, String);
  var competitionId = competitionUrlIdToId(competitionUrlId);
  if(!competitionId) {
    return [];
  }
  if(getCannotManageCompetitionReason(this.userId, competitionId)) {
    return [];
  }

  return [
    Groups.find({ competitionId: competitionId })
  ];
});
