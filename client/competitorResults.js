Template.competitorResults.helpers({
  results: function() {
    var results = Results.find({
      competitionId: this.competitionId,
      registrationId: this.registration._id,
    });
    return results;
  }
});
