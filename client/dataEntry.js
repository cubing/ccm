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
      let result = Results.findOne(selectedResultId, { fields: { position: 1, registrationId: 1 } });
      if(result.registration().checkedIn) {
        log.l3("Result", selectedResultId, "changed position to", result.position, "... recentering");
        let $selectedRow = template.$('tr.result[data-result-id="' + selectedResultId + '"]');
        $selectedRow.scrollToCenter();
      }
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
    let round = Rounds.findOne(data.roundId);
    results = round.getResultsWithRegistrations();
  });

  this.$('.typeahead').typeahead({
    hint: true,
    highlight: true,
    minLength: 1
  }, {
    name: 'results',
    displayKey: function(result) {
      return result.registration.uniqueName;
    },
    source: substringMatcher(function() { return results; }, 'registration.uniqueName'),
  });
};

function getSolveWarnings(resultId) {
  let solveTimes = $('.jChester').toArray().map((jChester, index) => $(jChester).jChester('getSolveTime'));
  let result = Results.findOne(resultId);
  result.solves = solveTimes;

  let round = result.round();

  let warnings = solveTimes.map(function(solveTime, index) {
    let expectedSolveCount = result.getExpectedSolveCount();
    let missedCutoff = expectedSolveCount != round.format().count;
    if(missedCutoff && index >= expectedSolveCount && solveTime) {
      // There's a SolveTime at this index and the user didn't make the cutoff.
      // Complain!
      return {
        classes: ['has-warnings', 'solve-skipped-due-to-cutoff'],
        text: 'Should not exist because previous solves did not make soft cutoff'
      };
    }

    let violatesTimeLimit = round.timeLimit && solveTime && !jChester.solveTimeIsDN(solveTime) && solveTime.millis > round.timeLimit.time.millis;
    if(violatesTimeLimit) {
      return {
        classes: ['has-warnings'],
        text: 'Greater than time limit'
      };
    }

    return null;
  });

  return warnings;
}

Template.roundDataEntry.helpers({
  selectedResultId: function() {
    return selectedResultIdReact.get();
  },
  notCheckedIn: function() {
    let result = Results.findOne(selectedResultIdReact.get(), { fields: { registrationId: 1 } });
    return !result.registration().checkedIn;
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
    // It's really important to only select solves, roundId, and registrationId here,
    // as anything else causes this helper to refire shortly after editing a time
    // (because the server computes its position, average, etc...)
    // which deselects all the text in our newly focused jChester.
    let result = Results.findOne(selectedResultId, { fields: { solves: 1, roundId: 1, registrationId: 1 } });
    return result.allSolves();
  },
});

Template.solveTimeEditor.helpers({
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
});

function userResultMaybeSelected(template, roundId, jChesterToFocusIndex) {
  jChesterToFocusIndex = jChesterToFocusIndex || 0;

  let $inputParticipantName = template.$('#inputParticipantName');
  let uniqueName = $inputParticipantName.typeahead('val');

  let round = Rounds.findOne(roundId);
  let registration = Registrations.findOne({
    competitionId: round.competitionId,
    uniqueName: uniqueName
  });
  if(!registration) {
    selectedResultIdReact.set(null);
    return;
  }
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

function showWarnings(resultId) {
  let $jChesters = $('.jChester');
  getSolveWarnings(resultId).forEach(function(warning, index) {
    let $jChester = $jChesters.eq(index);
    let $tr = $jChester.closest('tr');
    let $warningIcon = $tr.find('.solve-time-warning-icon');
    $tr.removeClass();

    let popover = $warningIcon.popover().data('bs.popover');
    if(warning !== null) {
      $tr.addClass(warning.classes.join(' '));
      popover.options.content = warning.text;
      $warningIcon.popover('show');
    } else {
      popover.options.content = '';
      $warningIcon.popover('hide');
    }
  });
}

function jChesterSave(solveIndex, $jChester, doneCallback) {
  let $tr = $jChester.closest('tr');
  let validationErrors = $jChester.jChester('getValidationErrors');
  if(validationErrors.length) {
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
  });
}

function getFocusables() {
  return $(".results-sidebar").find('#inputParticipantName, .jChester, #save-button');
}

function focusNextFocusable($currentElement, previous) {
  var $focusables = getFocusables();
  var index = $focusables.index($currentElement);
  if(previous) {
    index--;
  } else {
    index++;
  }
  $focusables.eq((index + $focusables.length) % $focusables.length).focus();
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
  'keyup .typeahead': function(e, template) {
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
  'keyup .jChester[name="inputSolve"]': function(e) {
    if(e.which == 13) { // enter
      let $jChester = $(e.currentTarget);

      let validationErrors = $jChester.jChester('getValidationErrors');
      if(validationErrors.length) {
        return;
      }

      focusNextFocusable($jChester, e.shiftKey);
    }
  },
  'blur .jChester[name="inputSolve"]': function(e, template) {
    showWarnings(selectedResultIdReact.get());
  },
  'keyup #inputParticipantName': function(e) {
    if(e.which == 13) { // enter
      focusNextFocusable($(e.currentTarget), e.shiftKey);
    }
  },
  'keyup #save-button': function(e) {
    if(e.which == 13) { // enter
      focusNextFocusable($(e.currentTarget), e.shiftKey);
    }
  },
  'focus #inputParticipantName': function(e) {
    e.currentTarget.select();
  },
  'focus .focusguard-top': function(e) {
    getFocusables().last().focus();
  },
  'focus .focusguard-bottom': function(e) {
    getFocusables().first().focus();
  },
  'click #save-button': function(e) {
    let selectedResultId = selectedResultIdReact.get();
    let result = Results.findOne(selectedResultId, { fields: { solves: 1, roundId: 1, registrationId: 1 } });

    $('.jChester').toArray().forEach(function(jChester, index) {
      let $jChester = $(jChester);
      jChesterSave(index, $jChester);
    });
  }
});
