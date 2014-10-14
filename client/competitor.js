Template.competitor.helpers({
  results: function() {
    var results = Results.find(
      { competitionId: this.competition._id, userId: this.user._id }
    );
    return results;
  }
});
