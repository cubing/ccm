global.api = {
  competitionUrlIdToId(competitionUrlId) {
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

  getCompetitions() {
    // TODO - someday when we're rich and successful, we'll have to paginate this
    return Competitions.find(
      { listed: true },
      { fields: { wcaCompetitionId: 1, competitionName: 1, listed: 1, startDate: 1 } }
    );
  },

  competitionAttr(competitionId, attribute) {
    let competition = Competitions.findOne(competitionId);

    return competition ? competition[attribute] : null;
  }
};
