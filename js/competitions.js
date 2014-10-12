if(Meteor.isClient) {

  Template.competitions.allComps = function() {
    return Competitions.find({}, {
      fields: {
        wcaCompetitionId: 1,
        competitionName: 1,
        listed: 1
      }
    });
  };

  Template.competitions.listedClass = function() {
    return this.listed ? "listed" : "unlisted";
  };

}
