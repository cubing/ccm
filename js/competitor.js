if(Meteor.isClient) {

  Template.competitorTemplate.results = function() {
    var results = Results.find(
      { competitionId: this.competition._id, userId: this.user._id }
    );
    return results;
  };

}
