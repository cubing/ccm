Template.competitions.helpers({
  allComps: function(){
    return Competitions.find({}, {
      fields: {
        wcaCompetitionId: 1,
        competitionName: 1,
        listed: 1
      }
    });
  },

  listedClass: function(){
    return this.listed ? "listed" : "unlisted";
  }
});
