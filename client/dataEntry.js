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
      // First clear the selectedCompetitor, and give Blaze a chance
      // to remove all the corresponding DOM nodes. This is needed to
      // clear all solve inputs because Blaze doesn't handle
      // case where an input's current value is different than the value
      // Blaze assigned it.
      selectedCompetitor.set(null);
      Meteor.setTimeout(function() {
        selectedCompetitor.set(user);
      }, 0);
    };
  },
  selectedCompetitor: function() {
    return selectedCompetitor.get();
  },
  selectedSolves: function() {
    var competitor = selectedCompetitor.get();
    var result = Results.findOne({
      competitionId: this.competitionId,
      roundId: this.roundId,
      userId: competitor._id,
    });
    var roundFormatCode = getRoundAttribute(this.roundId, 'formatCode');
    var roundFormat = wca.formatByCode[roundFormatCode];
    var solves = result.solves || [];
    while(solves.length < roundFormat.count) {
      solves.push(null);
    }
    return solves;
  },
});
