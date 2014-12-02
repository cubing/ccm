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

Meteor.publish('competition', function(competitionUrlId) {
  check(competitionUrlId, String);

  var competition = Competitions.findOne({
    $or: [
      { wcaCompetitionId: competitionUrlId },
      { _id: competitionUrlId }
    ]
  });
  if(!competition) {
    return [];
  }

  var registrations = Registrations.find({
    competitionId: competition._id,
  }, {
    userId: 1,
  }).fetch();
  if(!registrations) {
    return [];
  }

  return [
    Competitions.find({ _id: competition._id }),
    Rounds.find({ competitionId: competition._id }),
    Results.find({ competitionId: competition._id }),
    Meteor.users.find({
      _id: {
        $in: _.pluck(registrations, "userId")
      }
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

Meteor.publish('competitionScrambles', function(competitionUrlId) {
  check(competitionUrlId, String);
  if(getCannotManageCompetitionReason(this.userId, competitionUrlId)) {
    return [];
  }
  var competition = Competitions.findOne({
    $or: [
      { _id: competitionUrlId },
      { wcaCompetitionId: competitionUrlId }
    ]
  });

  return [
    Groups.find({ competitionId: competition._id })
  ];
});

Meteor.publish('registrations', function() {
  return Registrations.find();
});
