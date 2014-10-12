Competitions = new Meteor.Collection("competitions");
Rounds = new Meteor.Collection("rounds");
Results = new Meteor.Collection("results");
Groups = new Meteor.Collection("groups");


if(Meteor.isClient) {

  Accounts.ui.config({
    passwordSignupFields: 'USERNAME_AND_OPTIONAL_EMAIL'
  });

}

if(Meteor.isServer) {
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

  Meteor.publish('competition', function(wcaCompetitionIdOrCompetitionId) {
    check(wcaCompetitionIdOrCompetitionId, String);

    var competition = Competitions.findOne({
      $or: [
        { wcaCompetitionId: wcaCompetitionIdOrCompetitionId },
        { _id: wcaCompetitionIdOrCompetitionId }
      ]
    });
    if(!competition) {
      // TODO - what if the competition is created later? How will that data
      // get pushed out to users?
      return;
    }
    return [
      Competitions.find({ _id: competition._id }),
      Rounds.find({ competitionId: competition._id }),
      Results.find({ competitionId: competition._id }),
      Meteor.users.find(
        {_id: {$in: _.pluck(competition.competitors, "_id")}},
        {fields:{_id:1, "profile.name":1, "profile.wcaId":1, "profile.countryId":1, "profile.gender":1}}
      )
    ];
  });
}
