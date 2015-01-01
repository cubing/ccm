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
  // When a jChester is focused, there are two possiblities:
  //  1. If the jChester has unsaved changes, clear those changes,
  //     and select everything in the current text field.
  //  2. If the jChester has no unsaved changes, focus the name input.
  // If the name input is selected, blur it and remove the visible jChesters.
  // This lets the user escape from the focus loop created by the name input
  // and the time inputs.
  // If nothing is selected, focus the name input. This way you don't have to
  // use the mouse to do data entry.
  if(e.which == 27) { // escape
    var $focused = $(document.activeElement);
    var $jChester = $focused.closest('.jChester');
    var $inputCompetitorName = $('#inputCompetitorName');
    if($jChester.length) {
      var $tr = $jChester.closest('tr');

      var wasUnsaved = $tr.hasClass("unsaved");
      if(wasUnsaved) {
        // When the blur is handled, we won't save the current value,
        // because the unsaved class is not present.
        $tr.removeClass("unsaved");
      }

      var resultId = selectedResultIdReact.get();
      selectedResultIdReact.set(null);
      Meteor.defer(function() {
        selectedResultIdReact.set(resultId);
        if(!wasUnsaved) {
          $inputCompetitorName.focus();
        } else {
          Meteor.defer(function() {
            $focused.select();
          });
        }
      });
    } else if($focused[0] == $inputCompetitorName[0]) {
      selectedResultIdReact.set(null);
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

function userResultMaybeSelected(template, roundId, shiftKeyDown) {
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
    // If the user was holding down shift as they pressed return, cycle backwards
    if(shiftKeyDown) {
      template.$('.jChester').last().focus();
    } else {
      template.$('.jChester').first().focus();
    }
  }, 0);
}

function jChesterSave($jChester) {
  var $tr = $jChester.closest('tr');
  if(!$tr.hasClass("unsaved")) {
    // Don't bother saving unless something has actually changed.
    return true;
  }
  var solveTime = $jChester.jChester('getSolveTime');
  if(!solveTime) {
    return false;
  }
  // For now, we unconditionally force everything to be 2 decimal places.
  solveTime.decimals = 2;
  $tr.removeClass('unsaved');
  $tr.addClass('saving');
  var $set = {};
  $set['solves.' + this.index] = solveTime;
  var resultId = selectedResultIdReact.get();
  Results.update({
    _id: resultId,
  }, {
    $set: $set,
  }, function(err, res) {
    if(err) {
      throw err;
    }
    $tr.removeClass('saving');
  });
  return true;
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
      userResultMaybeSelected(template, this.roundId, e.shiftKey);
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
    var $target = $(e.currentTarget);
    $target.closest('tr').addClass('unsaved');
  },
  'blur .jChester[name="inputSolve"]': function(e) {
    var $jChester = $(e.currentTarget);
    jChesterSave.call(this, $jChester);
    // The impending DOM update will deselect the selected text in the next
    // jChester's focused input, so explicitly select it here.
    Tracker.afterFlush(function() {
      var $jChesterNew = $(document.activeElement).closest('.jChester');
      if($jChesterNew[0] !== $jChester[0]) {
        $jChesterNew.focus();
      }
    });
  },
  'keydown .jChester[name="inputSolve"]': function(e, template, solveTime) {
    if(e.which == 13) {
      var $jChester = $(e.currentTarget);

      var saved = jChesterSave.call(this, $jChester);
      if(!saved) {
        return;
      }

      var $sidebar = $jChester.closest(".results-sidebar");
      var $focusables = $sidebar.find('#inputCompetitorName, .jChester');
      var $next = $jChester.closest("tr").next("tr").find(".jChester");
      if($next.length === 0) {
        $next = $focusables.first();
      }
      var $prev = $jChester.closest("tr").prev("tr").find(".jChester");
      if($prev.length === 0) {
        $prev = $focusables.first();
      }
      if(e.shiftKey) {
        $prev.focus();
      } else {
        $next.focus();
      }
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
