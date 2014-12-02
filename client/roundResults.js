Template.roundResultsList.helpers({
  results: function() {
    var results = Results.find({
      competitionId: this.competitionId,
      roundId: this.roundId,
    });
    return results;
  },
  competitorName: function() {
    var user = Meteor.users.findOne({
      _id: this.userId
    }, {
      fields: {
        "profile.name": 1
      }
    });
    return user.profile.name;
  },
  competitorAdvanced: function() {
    var round = Rounds.findOne({
      _id: this.roundId,
    }, {
      fields: {
        competitionId: 1,
        eventCode: 1,
        nthRound: 1,
      }
    });
    var nextRound = Rounds.findOne({
      competitionId: round.competitionId,
      eventCode: round.eventCode,
      nthRound: round.nthRound + 1,
    }, {
      fields: {
        _id: 1,
        competitionId: 1,
      }
    });
    if(!nextRound) {
      // Nobody advances from final rounds =)
      return false;
    }
    var results = Results.findOne({
      competitionId: nextRound.competitionId,
      roundId: nextRound._id,
      userId: this.userId,
    });
    return !!results;
  },
  drawAdvanceLine: function() {
    var rootData = Template.parentData(2);
    if(!rootData.configurableAdvanceCount) {
      return false;
    }
    return rootData.advanceCount == this.position;
  },
});
