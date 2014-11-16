Template.roundResults.helpers({
  results: function(){
    var results = Results.find({
      competitionId: this.competitionId,
      roundId: this.roundId,
    });
    return results;
  },

  competitorName: function(){
    var user = Meteor.users.findOne({
      _id: this.userId
    }, {
      fields: {
        "profile.name": 1
      }
    });
    return user.profile.name;
  }
});
