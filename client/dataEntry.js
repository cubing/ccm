var log = logging.handle("dataEntry");

var selectedResultIdReact = new ReactiveVar(null);
Router.onBeforeAction(function() {
  // Clear selected result
  selectedResultIdReact.set(null);
  $('#inputParticipantName').typeahead('val', '');
  this.next();
});

Template.dataEntry.helpers({
  isSelectedRoundClosed: function() {
    return Rounds.findOne(this.roundId).isClosed();
  },
  isSelectedRoundUnstarted: function() {
    return Rounds.findOne(this.roundId).isUnstarted();
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
    var $inputParticipantName = $('#inputParticipantName');
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
          $inputParticipantName.focus();
        } else {
          Meteor.defer(function() {
            $('.jChester').eq(jChesterData.index).focus();
          });
        }
      });
    } else if($focused[0] == $inputParticipantName[0]) {
      selectedResultIdReact.set(null);
      $inputParticipantName.blur();
    } else {
      $inputParticipantName.focus();
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

  // Highlight the currently selected result row.
  template.autorun(function() {
    var selectedResultId = selectedResultIdReact.get();
    var $resultRows = template.$('tr.result');
    $resultRows.removeClass('selectedResult');
    if(selectedResultId) {
      // Query for the selected Result's position just so we recenter whenever its
      // position changes.
      var result = Results.findOne(selectedResultId, { fields: { position: 1 } });
      log.l3("Result", selectedResultId, "changed position to", result.position, "... recentering");
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
  // participants are added/removed from the round), we want to recompute the set
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

function getSolveWarnings(resultId, solveIndex) {
  var warnings = [];

  var result = Results.findOne(resultId);
  var round = Rounds.findOne(result.roundId);
  var solveTime = result.solves[solveIndex];
  var violatesHardCutoff = round.hardCutoff && solveTime && !jChester.solveTimeIsDN(solveTime) && solveTime.millis > round.hardCutoff.time.millis;
  if(violatesHardCutoff) {
    warnings.push('Greater than hard cutoff');
  }

  var expectedSolveCount = result.getExpectedSolveCount();
  var missedCutoff = expectedSolveCount != round.format().count;
  if(missedCutoff && solveIndex >= expectedSolveCount && solveTime) {
    // There's a SolveTime at this index and the user didn't make the cutoff.
    // Complain!
    warnings.push("Did not make soft cutoff");
  }
  return warnings;
}

Template.roundDataEntry.helpers({
  selectedResultId: function() {
    return selectedResultIdReact.get();
  },
  noShow: function() {
    var result = Results.findOne(selectedResultIdReact.get(), { fields: { noShow: 1 } });
    return result && result.noShow;
  },
  round: function() {
    return Rounds.findOne(this.roundId);
  },
  selectedSolves: function() {
    var selectedResultId = selectedResultIdReact.get();
    if(!selectedResultId) {
      return null;
    }
    var result = Results.findOne(selectedResultId, { fields: { solves: 1, roundId: 1 } });
    var round = Rounds.findOne(result.roundId);
    var solves = result.solves || [];
    while(solves.length < round.format().count) {
      solves.push(null);
    }
    return solves.map(function(solve, i) {
      return {
        solveTime: solve,
        index: i,
        resultId: selectedResultId,
      };
    });
  },
});

Template.solveTimeEditor.helpers({
  solveWarnings: function() {
    return getSolveWarnings(selectedResultIdReact.get(), this.index);
  },
  editableSolveTimeFields: function() {
    var data = Template.parentData(1);
    var fields = Rounds.findOne(data.roundId).eventSolveTimeFields();
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
  solveSkippedDueToCutoff: function() {
    var index = this.index;
    var result = Results.findOne(this.resultId);
    var expectedSolveCount = result.getExpectedSolveCount();
    return index >= expectedSolveCount;
  },
});

Template.solveTimeEditor.rendered = function() {
  var template = this;

  // Keep warning popup contents up to date.
  template.autorun(function() {
    var data = Template.currentData();
    var selectedResultId = selectedResultIdReact.get();
    var warnings = getSolveWarnings(selectedResultId, data.index);
    var $warningIcon = template.$('.solve-time-warning-icon');
    var popover = $warningIcon.popover().data('bs.popover');
    popover.options.content = warnings.join("<br>");

    var $focusedJChester = $(document.activeElement).closest('.jChester');
    var $jChester = template.find(".jChester");
    if(warnings.length > 0 && $focusedJChester[0] == $jChester[0]) {
      // Only show warnings if there are warnings and this jChester is focused.
      $warningIcon.popover('show');
    } else {
      $warningIcon.popover('hide');
    }
  });
};

function userResultMaybeSelected(template, roundId, jChesterToFocusIndex) {
  jChesterToFocusIndex = jChesterToFocusIndex || 0;

  var $inputParticipantName = template.$('#inputParticipantName');
  var uniqueName = $inputParticipantName.typeahead('val');
  var registration = Registrations.findOne({ uniqueName: uniqueName }, { _id: 1 });
  var result = Results.findOne({
    roundId: roundId,
    registrationId: registration._id,
  }, {
    fields: { _id: 1 }
  });
  if(!result) {
    selectedResultIdReact.set(null);
    return;
  }

  selectedResultIdReact.set(result._id);
  Meteor.defer(function() {
    var $jChesters = template.$('.jChester');
    if(jChesterToFocusIndex < 0) {
      jChesterToFocusIndex = $jChesters.length + jChesterToFocusIndex;
    }
    $jChesters.eq(jChesterToFocusIndex).focus();
  });
}

function jChesterSave(solveIndex, $jChester, doneCallback) {
  var $tr = $jChester.closest('tr');
  var validationErrors = $jChester.jChester('getValidationErrors');
  if(validationErrors.length) {
    return;
  }
  if(!$tr.hasClass("unsaved")) {
    // Don't bother saving unless something has actually changed.
    return;
  }
  var solveTime = $jChester.jChester('getSolveTime');
  // For now, we unconditionally force everything that has decimals to 2.
  if(solveTime && solveTime.decimals) {
    solveTime.decimals = 2;
  }
  $tr.removeClass('unsaved');
  $tr.addClass('saving');
  var resultId = selectedResultIdReact.get();
  Meteor.call('setSolveTime', resultId, solveIndex, solveTime, function(err, result) {
    if(!err) {
      $tr.removeClass('saving');
    } else {
      console.error("Meteor.call() error: " + err);
    }
    if(doneCallback) {
      doneCallback(err);
    }
  });
}

Template.roundDataEntry.events({
  'click #selectableResults tr.result': function(e, template) {
    var $row = $(e.currentTarget);
    var resultId = $row.data('result-id');

    var result = Results.findOne(resultId, { fields: { registrationId: 1 } });
    assert(result);

    var registration = Registrations.findOne(result.registrationId, { fields: { uniqueName: 1 } });
    assert(registration);

    var $inputParticipantName = template.$('#inputParticipantName');
    $inputParticipantName.typeahead('val', registration.uniqueName);

    var jChesterToFocusIndex = 0;

    // If the user actually clicked on an individual solve, focus that solve's jChester
    var $cell = $(e.target);
    if($cell.is('td.results-solve')) {
      var solveIndex = parseInt($cell.data('solve-index'));
      jChesterToFocusIndex = solveIndex;
    }

    userResultMaybeSelected(template, this.roundId, jChesterToFocusIndex);
  },
  'change input[name="noShow"]': function(e) {
    var noShow = e.currentTarget.checked;
    var resultId = selectedResultIdReact.get();
    Meteor.call("setResultNoShow", resultId, noShow);
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
    // If there are two participants: "Jay" and "Jayman", we wouldn't want to
    // force the user to start entering times for "Jay" when they were really just
    // typing the first 3 letters of "Jayman".
    selectedResultIdReact.set(null);
  },
  'solveTimeInput .jChester[name="inputSolve"]': function(e) {
    var $target = $(e.currentTarget);
    $target.closest('tr').addClass('unsaved');
  },
  'focus .jChester[name="inputSolve"]': function(e) {
    var $jChester = $(e.currentTarget);
    var $warningIcon = $jChester.parents("tr").find('i[data-toggle="popover"]');
    // Hide all other popovers first.
    $('[data-toggle="popover"]').not($warningIcon).popover('hide');
    setTimeout(function() {
      $warningIcon.popover('show');
    }, 100); // Nasty hack to make popup show up, sometimes it doesn't show up.
  },
  'blur .jChester[name="inputSolve"]': function(e) {
    // We save when the user leaves the currently focused jChester.
    var $jChester = $(e.currentTarget);

    var focusNewJChester = function() {
      Tracker.afterFlush(function() {
        var $jChesterNew = $(document.activeElement).closest('.jChester');
        if($jChesterNew[0] !== $jChester[0]) {
          $jChesterNew.focus();
          var $warningIconNew = $jChesterNew.parents("tr").find('i[data-toggle="popover"]');
          $('[data-toggle="popover"]').not($warningIconNew).popover('hide');
        }
      });
    };

    // Focus the new jChester. If we do this immediately, document.activeElement is still
    // the body, which isn't useful.
    focusNewJChester();

    // Save the time. Note that the impending does a Meteor.call which will
    // deselect the text we just tried to select above (hand wavy explanation, sorry).
    // It works to wait for the server to respond and then focus again.
    jChesterSave(this.index, $jChester, focusNewJChester);
  },
  'keydown .jChester[name="inputSolve"]': function(e) {
    if(e.which == 13) { // enter
      var $jChester = $(e.currentTarget);

      var validationErrors = $jChester.jChester('getValidationErrors');
      if(validationErrors.length) {
        return;
      }

      var $sidebar = $jChester.closest(".results-sidebar");
      var $focusables = $sidebar.find('#inputParticipantName, .jChester');
      var $next = $jChester.closest("tr").next("tr").find(".jChester");
      if($next.length === 0) {
        $next = $focusables.first();
      }
      var $prev = $jChester.closest("tr").prev("tr").find(".jChester");
      if($prev.length === 0) {
        $prev = $focusables.first();
      }
      // Note that we don't actually save here. That's because the following
      // will cause a blur, which will cause the actual save.
      if(e.shiftKey) {
        $prev.focus();
      } else {
        $next.focus();
      }
    }
  },
  'focus #inputParticipantName': function(e) {
    e.currentTarget.select();
  },
  'focus .focusguard-top': function(e) {
    var $target = $(e.currentTarget);
    var $sidebar = $target.closest(".results-sidebar");
    var $focusables = $sidebar.find('#inputParticipantName, .jChester');
    $focusables.last().focus();
  },
  'focus .focusguard-bottom': function(e) {
    var $target = $(e.currentTarget);
    var $sidebar = $target.closest(".results-sidebar");
    var $focusables = $sidebar.find('#inputParticipantName, .jChester');
    $focusables.first().focus();
  },
});
