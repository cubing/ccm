var selectedResultIdReact = new ReactiveVar(null);
Router.onBeforeAction(function() {
  // Clear selected result
  selectedResultIdReact.set(null);
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
});

Template.roundDataEntry.rendered = function() {
  var template = this;
  template.autorun(function() {
    // Highlight the currently selected result row.
    var selectedResultId = selectedResultIdReact.get();
    var $resultRows = template.$('tr.result');
    $resultRows.removeClass('selectedResult');
    if(selectedResultId) {
      var $selectedRow = $resultRows.filter('[data-result-id="' + selectedResultId + '"]');
      $selectedRow.addClass('selectedResult');
    }
  });

  var $sidebar = template.$('.results-sidebar');
  $sidebar.affix({
    offset: {
      top: function() {
        var parentTop = $sidebar.parent().offset().top;
        var affixTopSpacing = 20; // From .results-sidebar.affix in roundResults.css
        return parentTop - affixTopSpacing;
      },
    }
  });
};
Template.roundDataEntry.helpers({
  selectedResultId: function() {
    return selectedResultIdReact.get();
  },
  selectedSolves: function() {
    var selectedResultId = selectedResultIdReact.get();
    var result = Results.findOne({ _id: selectedResultId });
    var roundFormatCode = getRoundAttribute(this.roundId, 'formatCode');
    var roundFormat = wca.formatByCode[roundFormatCode];
    var solves = result.solves || [];
    while(solves.length < roundFormat.count) {
      solves.push(null);
    }
    return solves;
  },
  editableSolveTimeFields: function() {
    var data = Template.parentData(1);
    var eventCode = getRoundAttribute(data.roundId, 'eventCode');
    var fields = wca.eventByCode[eventCode].solveTimeFields;
    if(!fields) {
      // jChester will only use its default if the value for
      // editableSolveTimeFields is undefined, null won't work.
      return undefined;
    }
    var obj = {};
    _.each(fields, function(field) {
      obj[field] = true;
    });
    return obj;
  },
});
Template.roundDataEntry.events({
  'click #selectableResults tr.result': function(e) {
    var $row = $(e.currentTarget);
    var resultId = $row.data('result-id');
    selectedResultIdReact.set(resultId);
  },
});
