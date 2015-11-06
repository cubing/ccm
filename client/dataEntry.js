const log = logging.handle("dataEntry");

let selectedResultIdReact = new ReactiveVar(null);
Router.onBeforeAction(function() {
  // Clear selected result
  selectedResultIdReact.set(null);
  $('#inputParticipantName').typeahead('val', '');
  this.next();
});

Template.dataEntry.helpers({
  round: function() {
    return Rounds.findOne(this.roundId);
  }
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
    let $focused = $(document.activeElement);
    let $jChester = $focused.closest('.jChester');
    let $inputParticipantName = $('#inputParticipantName');
    if($jChester.length) {
      let $tr = $jChester.closest('tr');
      let wasUnsaved = $tr.hasClass("unsaved");

      let $trs = $tr.parent().find('tr');
      // To ensure that we don't save the current value when the blur is
      // handled, remove the unsaved class from all trs.
      $trs.removeClass("unsaved");

      let jChesterData = Blaze.getData($jChester[0]);
      let resultId = selectedResultIdReact.get();
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
  let template = this;

  // Center the currently selected result row.
  template.autorun(function() {
    let selectedResultId = selectedResultIdReact.get();
    if(selectedResultId) {
      // Query for the selected Result's position just so we recenter whenever its
      // position changes.
      let result = Results.findOne(selectedResultId, { fields: { position: 1 } });
      log.l3("Result", selectedResultId, "changed position to", result.position, "... recentering");
      let $selectedRow = template.$('tr.result[data-result-id="' + selectedResultId + '"]');
      $selectedRow.scrollToCenter();
    }
  });

  let $sidebar = template.$('.results-sidebar');
  $sidebar.affix({
    offset: {
      top: function() {
        let parentTop = $sidebar.parent().offset().top;
        let affixTopSpacing = 20; // From .results-sidebar.affix in dataEntry.less
        return parentTop - affixTopSpacing;
      },
    }
  });

  // This is subtle: we want to only query for users that are *in* the current round.
  // As the selected round changes (or less likely, but still possible:
  // participants are added/removed from the round), we want to recompute the set
  // of userIds we're interested in.
  let results = [];
  template.autorun(function() {
    let data = Template.currentData();
    let round = Round.findOne(data.roundId);
    results = round.getResultsWithRegistrations();
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
  let warnings = [];

  let result = Results.findOne(resultId);
  let round = Rounds.findOne(result.roundId);
  let solveTime = result.solves[solveIndex];
  let violatesHardCutoff = round.hardCutoff && solveTime && !jChester.solveTimeIsDN(solveTime) && solveTime.millis > round.hardCutoff.time.millis;
  if(violatesHardCutoff) {
    warnings.push('Greater than hard cutoff');
  }

  let expectedSolveCount = result.getExpectedSolveCount();
  let missedCutoff = expectedSolveCount != round.format().count;
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
    let result = Results.findOne(selectedResultIdReact.get(), { fields: { noShow: 1 } });
    return !!(result && result.noShow);
  },
  disableNoShow: function() {
    let result = Results.findOne(selectedResultIdReact.get(), { fields: { solves: 1 } });
    return result.solves && result.solves.length > 0;
  },
  noShowTooltip: function() {
    let result = Results.findOne(selectedResultIdReact.get(), { fields: { solves: 1 } });
    if(result.solves && result.solves.length > 0) {
      return "Cannot mark someone as a no show if they have results";
    }
    return "";
  },
  round: function() {
    return Rounds.findOne(this.roundId);
  },
  selectedSolves: function() {
    let selectedResultId = selectedResultIdReact.get();
    if(!selectedResultId) {
      return null;
    }
    let result = Results.findOne(selectedResultId, { fields: { solves: 1, roundId: 1 } });
    let round = Rounds.findOne(result.roundId);
    let solves = result.solves || [];
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
    let data = Template.parentData(1);
    let fields = Rounds.findOne(data.roundId).eventSolveTimeFields();
    if(!fields) {
      // jChester will only use its default if the value for
      // editableSolveTimeFields is undefined, null won't work.
      return undefined;
    }
    let obj = {};
    fields.forEach(field => {
      obj[field] = true;
    });
    return obj;
  },
  solveSkippedDueToCutoff: function() {
    let index = this.index;
    let result = Results.findOne(this.resultId);
    let expectedSolveCount = result.getExpectedSolveCount();
    return index >= expectedSolveCount;
  },
});

Template.solveTimeEditor.rendered = function() {
  let template = this;

  // Keep warning popup contents up to date.
  template.autorun(function() {
    let data = Template.currentData();
    let selectedResultId = selectedResultIdReact.get();
    let warnings = getSolveWarnings(selectedResultId, data.index);
    let $warningIcon = template.$('.solve-time-warning-icon');
    let popover = $warningIcon.popover().data('bs.popover');
    popover.options.content = warnings.join("<br>");

    let $focusedJChester = $(document.activeElement).closest('.jChester');
    let $jChester = template.find(".jChester");
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

  let $inputParticipantName = template.$('#inputParticipantName');
  let uniqueName = $inputParticipantName.typeahead('val');
  let registration = Registrations.findOne({ uniqueName: uniqueName }, { _id: 1 });
  let result = Results.findOne({
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
    let $jChesters = template.$('.jChester');
    if(jChesterToFocusIndex < 0) {
      jChesterToFocusIndex = $jChesters.length + jChesterToFocusIndex;
    }
    $jChesters.eq(jChesterToFocusIndex).focus();
  });
}

function jChesterSave(solveIndex, $jChester, doneCallback) {
  let $tr = $jChester.closest('tr');
  let validationErrors = $jChester.jChester('getValidationErrors');
  if(validationErrors.length) {
    return;
  }
  if(!$tr.hasClass("unsaved")) {
    // Don't bother saving unless something has actually changed.
    return;
  }
  let solveTime = $jChester.jChester('getSolveTime');
  // For now, we unconditionally force everything that has decimals to 2.
  if(solveTime && solveTime.decimals) {
    solveTime.decimals = 2;
  }
  $tr.removeClass('unsaved');
  $tr.addClass('saving');
  let resultId = selectedResultIdReact.get();
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
    let $row = $(e.currentTarget);
    let resultId = $row.data('result-id');

    let result = Results.findOne(resultId, { fields: { registrationId: 1 } });
    assert(result);

    let registration = Registrations.findOne(result.registrationId, { fields: { uniqueName: 1 } });
    assert(registration);

    let $inputParticipantName = template.$('#inputParticipantName');
    $inputParticipantName.typeahead('val', registration.uniqueName);

    let jChesterToFocusIndex = 0;

    // If the user actually clicked on an individual solve, focus that solve's jChester
    let $cell = $(e.target);
    if($cell.is('td.results-solve')) {
      let solveIndex = parseInt($cell.data('solve-index'));
      jChesterToFocusIndex = solveIndex;
    }

    userResultMaybeSelected(template, this.roundId, jChesterToFocusIndex);
  },
  'click #js-no-show-button': function(e) {
    let resultId = selectedResultIdReact.get();
    let result = Results.findOne(resultId);
    if(result.solves && result.solves.length > 0) {
      // Don't bother trying to set noShow for a result with solves.
      return;
    }
    let newNoShow = !result.noShow;
    Meteor.call("setResultNoShow", resultId, newNoShow, error => {
      if(error) {
        bootbox.alert(`Error! ${error.reason}`);
        return;
      }
      if(newNoShow) {
        Meteor.call('getBestNotAdvancedResultFromRoundPreviousToThisOne', this.roundId, (error, luckyResult) => {
          if(error) {
            bootbox.alert(`Error! ${error.reason}`);
            return;
          }
          if(!luckyResult) {
            // We didn't find any lucky people to possibly advance.
            return;
          }
          let noShowRegistration = Registrations.findOne(result.registrationId);
          let luckyNewRegistration = Registrations.findOne(luckyResult.registrationId);
          bootbox.dialog({
            message: `Just marked ${noShowRegistration.uniqueName} as a no show. Would you like to advance ${luckyNewRegistration.uniqueName} (#${luckyResult.position} from the previous round)?`,
            buttons: {
              "Yes": {
                className: 'btn-success',
                callback: () => {
                  Meteor.call('advanceResultIdFromRoundPreviousToThisOne', luckyResult._id, this.roundId, error => {
                    if(error) {
                      bootbox.alert(`Error! ${error.reason}`);
                      return;
                    }
                  });
                }
              },
              "No": {
                className: 'btn-default',
              }
            },
            closeButton: false,
            callback: function() {
              console.log("arguments");
            }
          });
        });
      }
    });
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
    let $target = $(e.currentTarget);
    $target.closest('tr').addClass('unsaved');
  },
  'focus .jChester[name="inputSolve"]': function(e) {
    let $jChester = $(e.currentTarget);
    let $warningIcon = $jChester.parents("tr").find('i[data-toggle="popover"]');
    // Hide all other popovers first.
    $('[data-toggle="popover"]').not($warningIcon).popover('hide');
    setTimeout(function() {
      $warningIcon.popover('show');
    }, 100); // Nasty hack to make popup show up, sometimes it doesn't show up.
  },
  'blur .jChester[name="inputSolve"]': function(e) {
    // We save when the user leaves the currently focused jChester.
    let $jChester = $(e.currentTarget);

    let focusNewJChester = function() {
      Tracker.afterFlush(function() {
        let $jChesterNew = $(document.activeElement).closest('.jChester');
        if($jChesterNew[0] !== $jChester[0]) {
          $jChesterNew.focus();
          let $warningIconNew = $jChesterNew.parents("tr").find('i[data-toggle="popover"]');
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
      let $jChester = $(e.currentTarget);

      let validationErrors = $jChester.jChester('getValidationErrors');
      if(validationErrors.length) {
        return;
      }

      let $sidebar = $jChester.closest(".results-sidebar");
      let $focusables = $sidebar.find('#inputParticipantName, .jChester');
      let $next = $jChester.closest("tr").next("tr").find(".jChester");
      if($next.length === 0) {
        $next = $focusables.first();
      }
      let $prev = $jChester.closest("tr").prev("tr").find(".jChester");
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
    let $target = $(e.currentTarget);
    let $sidebar = $target.closest(".results-sidebar");
    let $focusables = $sidebar.find('#inputParticipantName, .jChester');
    $focusables.last().focus();
  },
  'focus .focusguard-bottom': function(e) {
    let $target = $(e.currentTarget);
    let $sidebar = $target.closest(".results-sidebar");
    let $focusables = $sidebar.find('#inputParticipantName, .jChester');
    $focusables.first().focus();
  },
});
