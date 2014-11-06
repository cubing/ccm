Template.competitor.helpers({
  results: function() {
    var results = Results.find({
      competitionId: this.competitionId,
      userId: this.user._id
    });
    return results;
  }
});
