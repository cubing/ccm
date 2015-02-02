Template.competitions.helpers({
  competitions: function() {
    return Competitions.find({}, {
      fields: {
        wcaCompetitionId: 1,
        competitionName: 1,
        listed: 1,
      }
    });
  },
});
