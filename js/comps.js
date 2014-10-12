if(Meteor.isClient) {

  Template.compsTemplate.allComps = function() {
    return Competitions.find({}, {
      fields: {
        wcaCompetitionId: 1,
        competitionName: 1,
        listed: 1
      }
    });
  };

  Template.compsTemplate.listedClass = function() {
    return this.listed ? "listed" : "unlisted";
  };

}
