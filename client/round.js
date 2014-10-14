Template.round.helpers({
  results: function() {
    var results = Results.find(
      { competitionId: this.competition._id, roundId: this.round._id }
    );
    return results;
  },

  competitorName: function() {
    var user = Meteor.users.findOne(
      { _id: this.userId },
      { fields: {"profile.name": 1} }
    );
    if(!user) {
      return null;
    }
    return user.profile.name;
  }
});
