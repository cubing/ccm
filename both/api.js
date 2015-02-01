api = {
  competitionUrlIdToId: function(competitionUrlId) {
    var competition = Competitions.findOne({
      $or: [
        { _id: competitionUrlId },
        { wcaCompetitionId: competitionUrlId },
      ]
    }, {
      fields: {
        _id: 1,
      }
    });
    if(!competition) {
      return null;
    }
    return competition._id;
  },
  getCompetitions: function() {
    // TODO - someday when we're rich and successful, we'll have to paginate this
    return Competitions.find(
      {},
      { fields: { wcaCompetitionId: 1, competitionName: 1, listed: 1 } }
    );
  },
};
