var log = logging.handle("dataEntry");

var selectedResultIdReact = new ReactiveVar(null);
Router.onBeforeAction(function() {
  // Clear selected result
  selectedResultIdReact.set(null);
  $('#inputCompetitorName').typeahead('val', '');
  this.next();
});

Template.dataEntry.created = function() {
  var template = this;
  template.showAllRoundsReact = new ReactiveVar(false);
};

Template.dataEntry.helpers({
  showAllRounds: function() {
    if(this.roundId) {
      var status = getRoundAttribute(this.roundId, 'status');
      if(status !== wca.roundStatuses.open) {
        // If the selected round is not open, we need to show all rounds so we
        // can see the selected round.
        return true;
      }
    } else {
      // If they've only selected an eventCode, we want to show all rounds.
      return true;
    }

    var template = Template.instance();
    return template.showAllRoundsReact.get();
  },

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
  isSelectedRound: function() {
    var data = Template.parentData(1);
    var selectedRoundId = data.roundId;
    return selectedRoundId == this._id;
  },
});

Template.dataEntry.events({
  'click #showAllRoundsLink': function(e, template) {
    e.preventDefault();
    template.showAllRoundsReact.set(!template.showAllRoundsReact.get());
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

      var $trs = $tr.parent().find('tr');
      // To ensure that we don't save the current value when the blur is
      // handled, remove the unsaved class from all trs.
      $trs.removeClass("unsaved");

      var jChesterData = Blaze.getData($jChester[0]);
      var resultId = selectedResultIdReact.get();
      selectedResultIdReact.set(null);
      Meteor.defer(function() {
        selectedResultIdReact.set(resultId);
        if(!wasUnsaved) {
          $inputCompetitorName.focus();
        } else {
          Meteor.defer(function() {
            $('.jChester').eq(jChesterData.index).focus();
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
    results = getResultsWithUniqueNamesForRound(data.roundId);
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
  round: function() {
    return Rounds.findOne(this.roundId);
  },
  solveWarnings: function() {
    var warnings = [];

    var parentData = Template.parentData(1);
    var roundId = parentData.roundId;
    var hardCutoff = getRoundAttribute(roundId, "hardCutoff");
    var violatesHardCutoff = hardCutoff && this.solveTime && wca.compareSolveTimes(this.solveTime, hardCutoff.time) > 0 && !jChester.solveTimeIsDN(this.solveTime);
    if(violatesHardCutoff) {
      warnings.push([ 'Greater than hard cutoff' ]);
    }
    return warnings;
  },
  selectedSolves: function() {
    var selectedResultId = selectedResultIdReact.get();
    var result = Results.findOne({
      _id: selectedResultId,
    }, {
      fields: {
        solves: 1,
      }
    });
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

function userResultMaybeSelected(template, roundId, jChesterToFocusIndex) {
  jChesterToFocusIndex = jChesterToFocusIndex || 0;

  var $inputCompetitorName = template.$('#inputCompetitorName');
  var uniqueName = $inputCompetitorName.typeahead('val');
  var registration = Registrations.findOne({
    uniqueName: uniqueName,
  }, {
    _id: 1,
  });
  var result = Results.findOne({
    roundId: roundId,
    registrationId: registration._id,
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
    var $jChesters = template.$('.jChester');
    if(jChesterToFocusIndex < 0) {
      jChesterToFocusIndex = $jChesters.length + jChesterToFocusIndex;
    }
    $jChesters.eq(jChesterToFocusIndex).focus();
  }, 0);
}

function jChesterSave($jChester) {
  var $tr = $jChester.closest('tr');
  var validationErrors = $jChester.jChester('getValidationErrors');
  if(validationErrors.length) {
    return false;
  }
  if(!$tr.hasClass("unsaved")) {
    // Don't bother saving unless something has actually changed.
    return true;
  }
  var solveTime = $jChester.jChester('getSolveTime');
  // For now, we unconditionally force everything that has decimals to 2.
  if(solveTime && solveTime.decimals) {
    solveTime.decimals = 2;
  }
  $tr.removeClass('unsaved');
  $tr.addClass('saving');
  var resultId = selectedResultIdReact.get();
  var solveIndex = this.index;
  Meteor.call('setSolveTime', resultId, solveIndex, solveTime, function(err, res) {
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
        registrationId: 1,
      }
    });
    assert(result);

    var registration = Registrations.findOne({
      _id: result.registrationId,
    }, {
      fields: {
        uniqueName: 1,
      }
    });
    assert(registration);

    var $inputCompetitorName = template.$('#inputCompetitorName');
    $inputCompetitorName.typeahead('val', registration.uniqueName);

    var jChesterToFocusIndex = 0;

    // If the user actually clicked on an individual solve, focus that solve's jChester
    var $cell = $(e.target);
    if($cell.is('td.results-solve')) {
      var solveIndex = parseInt($cell.data('solve-index'));
      jChesterToFocusIndex = solveIndex;
    }

    userResultMaybeSelected(template, this.roundId, jChesterToFocusIndex);
  },
  'typeahead:selected .typeahead': function(e, template, suggestion, datasetName) {
    userResultMaybeSelected(template, this.roundId);
  },
  'typeahead:autocompleted .typeahead': function(e, template, suggestion, datasetName) {
    // Do nothing here. Wait for the user to actually select a result.
  },
  'keydown .typeahead': function(e, template) {
    if(e.which == 13) {
      userResultMaybeSelected(template, this.roundId, e.shiftKey ? -1 : 0);
    }
  },
  'input .typeahead': function(e, template) {
    // Wait for stronger user intent before we show the data entry fields.
    // If there are two competitors: "Jay" and "Jayman", we wouldn't want to
    // force the user to start entering times for "Jay" when they were really just
    // typing the first 3 letters of "Jayman".
    selectedResultIdReact.set(null);
  },
  'solveTimeInput .jChester[name="inputSolve"]': function(e) {
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
  'keydown .jChester[name="inputSolve"]': function(e) {
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
