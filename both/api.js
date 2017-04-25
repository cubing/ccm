api = {
  competitionUrlIdToId: function(competitionUrlId) {
    let competition = Competitions.findOne({
      $or: [
        { _id: competitionUrlId },
        { wcaCompetitionId: competitionUrlId },
      ]
    }, {
      fields: { _id: 1 }
    });
    return competition ? competition._id : null;
  },
  getCompetitions: function() {
    // TODO - someday when we're rich and successful, we'll have to paginate this
    return Competitions.find(
      { listed: true },
      { fields: { wcaCompetitionId: 1, competitionName: 1, listed: 1, startDate: 1 } }
    );
  },
};
