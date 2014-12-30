var log = logging.handle("dataEntry");

var selectedResultIdReact = new ReactiveVar(null);
Router.onBeforeAction(function() {
  // Clear selected result
  selectedResultIdReact.set(null);
  $('#inputCompetitorName').typeahead('val', '');
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

function keydown(e) {
  // The escape key does a few things for data entry.
  // When a jChester is focused, deselect the current result and focus the
  // name input.
  // If the name input is selected, blur it. This lets the user escape from the
  // focus loop created by the name input and the time inputs.
  // If nothing is selected, focus the name input. This way you don't have to
  // use the mouse to do data entry.
  if(e.which == 27) { // escape
    var $focused = $(document.activeElement);
    var $jChester = $focused.closest('.jChester');
    var $inputCompetitorName = $('#inputCompetitorName');
    if($jChester.length) {
      selectedResultIdReact.set(null);
      $inputCompetitorName.focus();
    } else if($focused[0] == $inputCompetitorName[0]) {
      $inputCompetitorName.blur();
    } else {
      $inputCompetitorName.focus();
    }
  }
}
Template.roundDataEntry.created = function() {
  $(document).on('keydown', keydown);
};
Template.roundDataEntry.destroyed = function() {
  $(document).off('keydown', keydown);
};
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
      $selectedRow.scrollToCenter();
    }
  });

  var $sidebar = template.$('.results-sidebar');
  $sidebar.affix({
    offset: {
      top: function() {
        var parentTop = $sidebar.parent().offset().top;
        var affixTopSpacing = 20; // From .results-sidebar.affix in dataEntry.less
        return parentTop - affixTopSpacing;
      },
    }
  });

  // This is subtle: we want to only query for users that are *in* the current round.
  // As the selected round changes (or less likely, but still possible:
  // competitors are added/removed from the round), we want to recompute the set
  // of userIds we're interested in.
  var results = [];
  template.autorun(function() {
    var data = Template.currentData();
    results = Results.find({
      roundId: data.roundId,
    }, {
      fields: {
        _id: 1,
        uniqueName: 1,
      }
    }).fetch();
  });

  this.$('.typeahead').typeahead({
    hint: true,
    highlight: true,
    minLength: 1
  }, {
    name: 'results',
    displayKey: function(result) {
      return result.uniqueName;
    },
    source: substringMatcher(function() { return results; }, 'uniqueName'),
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
    return solves.map(function(solve, i) {
      return {
        solveTime: solve,
        index: i,
      };
    });
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

function userResultMaybeSelected(template, roundId) {
  var $inputCompetitorName = template.$('#inputCompetitorName');
  var uniqueName = $inputCompetitorName.typeahead('val');
  var result = Results.findOne({
    roundId: roundId,
    uniqueName: uniqueName,
  }, {
    fields: {
      _id: 1,
    }
  });
  if(!result) {
    selectedResultIdReact.set(null);
    return;
  }

  selectedResultIdReact.set(result._id);
  setTimeout(function() {
    template.$('.jChester').first().focus();
  }, 0);
}

Template.roundDataEntry.events({
  'click #selectableResults tr.result': function(e, template) {
    var $row = $(e.currentTarget);
    var resultId = $row.data('result-id');

    var result = Results.findOne({
      _id: resultId,
    }, {
      fields: {
        uniqueName: 1,
      }
    });
    assert(result);

    var $inputCompetitorName = template.$('#inputCompetitorName');
    $inputCompetitorName.typeahead('val', result.uniqueName);

    userResultMaybeSelected(template, this.roundId);
  },
  'typeahead:selected .typeahead': function(e, template, suggestion, datasetName) {
    userResultMaybeSelected(template, this.roundId);
  },
  'typeahead:autocompleted .typeahead': function(e, template, suggestion, datasetName) {
    userResultMaybeSelected(template, this.roundId);
  },
  'keydown .typeahead': function(e, template) {
    if(e.which == 13) {
      userResultMaybeSelected(template, this.roundId);
    }
  },
  'input .typeahead': function(e, template) {
    // Wait for stronger user intent before we show the data entry fields.
    // If there are two competitors: "Jay" and "Jayman", we wouldn't want to
    // force the user to start entering times for "Jay" when they were really just
    // typing the first 3 letters of "Jayman".
    selectedResultIdReact.set(null);
  },
  'solveTimeInput .jChester[name="inputSolve"]': function(e, template, solveTime) {
    if(!solveTime) {
      return;
    }
    var $set = {};
    $set['solves.' + this.index] = solveTime;
    var resultId = selectedResultIdReact.get();
    Results.update({
      _id: resultId,
    }, {
      $set: $set,
    });
  },
  'solveTimeChange .jChester[name="inputSolve"]': function(e, template, solveTime) {
    if(!solveTime) {
      return;
    }

    var $target = $(e.currentTarget);
    var $jChesterNext = $target.parent().next("li").find(".jChester");
    if($jChesterNext.length > 0) {
      $jChesterNext.focus();
    } else {
      var $sidebar = $target.closest(".results-sidebar");
      var $focusables = $sidebar.find('#inputCompetitorName, .jChester');
      $focusables.first().focus();
    }
  },
  'focus #inputCompetitorName': function(e) {
    e.currentTarget.select();
  },
  'focus #focusguard-1': function(e) {
    var $target = $(e.currentTarget);
    var $sidebar = $target.closest(".results-sidebar");
    var $focusables = $sidebar.find('#inputCompetitorName, .jChester');
    $focusables.last().focus();
  },
  'focus #focusguard-2': function(e) {
    var $target = $(e.currentTarget);
    var $sidebar = $target.closest(".results-sidebar");
    var $focusables = $sidebar.find('#inputCompetitorName, .jChester');
    $focusables.first().focus();
  },
});
