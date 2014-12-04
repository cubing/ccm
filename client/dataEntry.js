var selectedCompetitor = new ReactiveVar(null);
Router.onBeforeAction(function() {
  // Clear selected competitor
  selectedCompetitor.set(null);
  $('#inputCompetitorName').val('');

  this.next();
});
Template.dataEntry.helpers({
  isSelectedRoundClosed: function() {
    if(!this.roundId) {
      // If there's no round selected, then the selected round is definitely
      // *not* closed =)
      return false;
    }
    var status = getRoundAttribute(this.roundId, 'status');
    return status === wca.roundStatuses.closed;
  },
  openRounds: function() {
    var openRounds = Rounds.find({
      competitionId: this.competitionId,
      status: wca.roundStatuses.open,
    }, {
      sort: {
        eventCode: 1,
        nthRound: 1,
      }
    });
    return openRounds;
  },
  closedRounds: function() {
    var closedRounds = Rounds.find({
      competitionId: this.competitionId,
      status: wca.roundStatuses.closed,
    }, {
      sort: {
        eventCode: 1,
        nthRound: 1,
      }
    });
    return closedRounds;
  },
  isSelectedRound: function() {
    var data = Template.parentData(1);
    var selectedRoundId = data.roundId;
    return selectedRoundId == this._id;
  },
  selectCompetitorListener: function() {
    return function(user) {
      selectedCompetitor.set(user);
    };
  },
  selectedCompetitor: function() {
    return selectedCompetitor.get();
  },
  resultForSelectedCompetitor: function() {
    var competitor = selectedCompetitor.get();
    var result = Results.findOne({
      competitionId: this.competitionId,
      roundId: this.roundId,
      userId: competitor._id,
    });
    return result;
  },
  time: function() {
    // TODO - time objects should become a full fledged part of our database
    return {
      millis: this*10,
      decimals: 2,
    };
  },
});
