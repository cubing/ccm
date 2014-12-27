var log = logging.handle("editCompetition");

var roundPopupReact = new ReactiveVar(null);

setCompetitionAttribute = function(competitionId, attribute, value) {
  var update;
  if(value === null || typeof value === "undefined") {
    var toUnset = {};
    toUnset[attribute] = 1;
    update = { $unset: toUnset };
  } else {
    var toSet = {};
    toSet[attribute] = value;
    update = { $set: toSet };
  }
  Competitions.update({ _id: competitionId }, update);
};

function getCompetitionData(competitionId) {
  var hasCompetitionData = Competitions.findOne({
    _id: competitionId
  });

  return hasCompetitionData;
}

Template.editCompetition.events({
  'input #competitionAttributes input[type="text"]': function(e) {
    if($(e.currentTarget).hasClass("typeahead")) {
      return;
    }
    var attribute = e.currentTarget.name;
    var value = e.currentTarget.value;
    setCompetitionAttribute(this.competitionId, attribute, value);
  },
  'change #competitionAttributes input[type="checkbox"]': function(e) {
    var attribute = e.currentTarget.name;
    var value = e.currentTarget.checked;
    setCompetitionAttribute(this.competitionId, attribute, value);
  },
  'click #competitionAttributes #toggleCompetitionListed': function(e) {
    var listed = getCompetitionAttribute(this.competitionId, 'listed');
    setCompetitionAttribute(this.competitionId, 'listed', !listed);
  },
  'click button[name="buttonDeleteCompetition"]': function(e) {
    var that = this;
    // Note that we navigate away from the competition page first, and wait for the
    // navigation to complete before we actually delete the competition. This
    // avoids a bunch of spurious error messages in the console due to looking
    // up attributes of a competition that no longer exists.
    Router.go('home');
    setTimeout(function() {
      Meteor.call("deleteCompetition", that.competitionId, function(err, data) {
        if(err) {
          throw err;
        }
      });
    }, 0);
  },
  'click button[name="buttonAddRound"]': function(e, template) {
    Meteor.call('addRound', this.competitionId, this.eventCode);
  },
  'click button[name="buttonRemoveRound"]': function(e, template) {
    var lastRoundResultsCount = getLastRoundResultsCount(this.competitionId, this.eventCode);
    if(lastRoundResultsCount > 0) {
      $("#modalReallyRemoveRound_" + this.eventCode).modal('show');
    } else {
      var lastRoundId = getLastRoundIdForEvent(this.competitionId, this.eventCode);
      Meteor.call('removeRound', lastRoundId);
    }
  },
  'click button[name="buttonReallyRemoveRound"]': function(e, template) {
    var lastRoundId = getLastRoundIdForEvent(this.competitionId, this.eventCode);
    assert(lastRoundId);
    $("#modalReallyRemoveRound_" + this.eventCode).modal('hide');
    Meteor.call('removeRound', lastRoundId);
  },
  'click button[name="buttonOpenRound"]': function(e, template) {
    Rounds.update({
      _id: this._id,
    }, {
      $set: {
        status: wca.roundStatuses.open,
      }
    });
  },
  'click button[name="buttonCloseRound"]': function(e, template) {
    Rounds.update({
      _id: this._id,
    }, {
      $set: {
        status: wca.roundStatuses.closed,
      }
    });
  },
  'click button[name="buttonAdvanceCompetitors"]': function(e, template) {
    roundPopupReact.set({ advanceCompetitors: this });
    $("#modalAdvanceRound").modal('show');
  },
  'change select[name="roundFormat"]': function(e) {
    var select = e.currentTarget;
    var formatCode = select.value;
    var roundId = this._id;
    Rounds.update({
      _id: roundId
    }, {
      $set: {
        formatCode: formatCode
      }
    });
  },
  'click button[name="buttonSetRoundSize"]': function(e, template) {
    roundPopupReact.set({ setRoundSize: this });
    $("#modalSetRoundSize").modal('show');
  },
  'click button[name="buttonHardCutoff"]': function(e, template) {
    roundPopupReact.set({ hardCutoff: this });
    $("#modalHardCutoff").modal('show');
  },
  'click button[name="buttonSoftCutoff"]': function(e, template) {
    roundPopupReact.set({softCutoff: this });
    $("#modalSoftCutoff").modal('show');
  },
  'hidden.bs.modal .modal': function(e, template) {
    roundPopupReact.set(null);
  }
});

Template.modalAdvanceRound.created = function() {
  var template = this;

  template.advanceCountReact = new ReactiveVar(null);
  template.autorun(function() {
    var data = Template.currentData();
    if(!data) {
      template.advanceCountReact.set(null);
      return;
    }

    var nextRound = Rounds.findOne({
      competitionId: data.competitionId,
      eventCode: data.eventCode,
      nthRound: data.nthRound + 1,
    }, {
      fields: {
        size: 1,
      }
    });
    if(nextRound) {
      var competitorsInRound = Results.find({
        roundId: nextRound._id,
      }, {
        fields: {
          _id: 1,
        }
      }).count();
      template.advanceCountReact.set(nextRound.size || competitorsInRound || null);
    } else {
      template.advanceCountReact.set(null);
    }
  });

  template.isSaveableReact = new ReactiveVar(false);
  template.autorun(function() {
    var data = Template.currentData();
    if(!data) {
      template.isSaveableReact.set(null);
      return;
    }
    template.isSaveableReact.set(template.advanceCountReact.get());
  });
};
Template.modalAdvanceRound.events({
  'shown.bs.modal .modal': function(e, template) {
    // Focus first input when we become visible
    template.$('input').filter(':visible:first').focus();
    template.$('input').filter(':visible:first').select();
  },
  'input input[name="advanceCount"]': function(e, template) {
    var $input = $(e.currentTarget);
    var advanceCountStr = $input.val();
    var isNonNegInt = String.isNonNegInt(advanceCountStr);
    if(isNonNegInt) {
      var advanceCount = parseInt(advanceCountStr);
      template.advanceCountReact.set(advanceCount);
    } else {
      template.advanceCountReact.set(null);
    }
  },
  'submit form': function(e, template) {
    e.preventDefault();

    var advanceCount = template.advanceCountReact.get();
    Meteor.call('advanceCompetitorsFromRound', advanceCount, this._id, function(err, data) {
      if(err) {
        throw err;
      }
      template.$(".modal").modal('hide');
    });
  },
});
Template.modalAdvanceRound.helpers({
  isSaveable: function() {
    var template = Template.instance();
    return template.isSaveableReact.get();
  },
  competitorsInRound: function() {
    var competitorCount = Results.find({
      roundId: this._id,
    }).count();
    return competitorCount;
  },
  advanceCount: function() {
    var template = Template.instance();
    return template.advanceCountReact.get();
  },
});

Template.modalSetRoundSize.created = function() {
  var template = this;
  template.isSaveableReact = new ReactiveVar(false);
  template.autorun(function() {
    var data = Template.currentData();
    template.isSaveableReact.set(!!data);
  });
};
Template.modalSetRoundSize.helpers({
  isSaveable: function() {
    var template = Template.instance();
    return template.isSaveableReact.get();
  },
});
Template.modalSetRoundSize.events({
  'shown.bs.modal .modal': function(e, template) {
    // Focus first input when we become visible
    template.$('input').filter(':visible:first').focus();
    template.$('input').filter(':visible:first').select();
  },
  'input input[name="roundSize"]': function(e, template) {
    template.isSaveableReact.set(e.currentTarget.validity.valid);
  },
  'submit form': function(e, template) {
    e.preventDefault();

    var $input = $('input[name="roundSize"]');
    var sizeStr = $input.val();
    var toSet = {};
    if(sizeStr) {
      var size = parseInt(sizeStr);
      toSet.$set = { size: size };
    } else {
      toSet.$unset = { size: 1 };
    }
    Rounds.update({
      _id: this._id,
    }, toSet);
    template.$(".modal").modal('hide');
  },
});

Template.modalSoftCutoff.created = function() {
  var template = this;
  template.showTimeEntryReact = new ReactiveVar(false);
  template.isSaveableReact = new ReactiveVar(false);
  template.autorun(function() {
    var data = Template.currentData();
    template.showTimeEntryReact.set(data && data.softCutoff);
    template.isSaveableReact.set(!!data);
  });
};
Template.modalSoftCutoff.helpers({
  softCutoffFormats: function() {
    return wca.softCutoffFormats;
  },
  isCurrentSoftCutoffFormat: function() {
    var round = Template.parentData(1);
    if(!round.softCutoff) {
      return false;
    }
    var softCutoffFormatCode = this.code;
    return round.softCutoff.formatCode == softCutoffFormatCode;
  },
  isAllowedSoftCutoffFormat: function() {
    var round = Template.parentData(1);
    var roundFormat = wca.formatByCode[round.formatCode];
    var softCutoffFormatCode = this.code;
    return _.contains(roundFormat.softCutoffFormatCodes, softCutoffFormatCode);
  },
  showTimeEntry: function() {
    var template = Template.instance();
    return template.showTimeEntryReact.get();
  },
  isSaveable: function() {
    var template = Template.instance();
    return template.isSaveableReact.get();
  },
});
Template.modalSoftCutoff.events({
  'shown.bs.modal .modal': function(e, template) {
    // Focus first input when we become visible
    template.$('input').filter(':visible:first').focus();
    template.$('input').filter(':visible:first').select();
  },
  'change select[name="softCutoffFormatCode"]': function(e, template) {
    var select = e.currentTarget;
    var softCutoffFormatCode = select.value;
    template.showTimeEntryReact.set(!!softCutoffFormatCode);
  },
  'solveTimeInput [name="inputSoftCutoff"]': function(e, template, solveTime) {
    template.isSaveableReact.set(!!solveTime);
  },
  'submit form': function(e, template) {
    e.preventDefault();

    var $selectCutoffFormat = template.$('select[name="softCutoffFormatCode"]');
    var formatCode = $selectCutoffFormat.val();

    var $inputSoftCutoff = template.$('[name="inputSoftCutoff"]');
    var time = $inputSoftCutoff.jChester('getSolveTime');

    var toSet = {};
    if(formatCode) {
      toSet.$set = {
        // Explicitly listing all the fields in SolveTime as a workaround for
        //  https://github.com/aldeed/meteor-simple-schema/issues/202
        //softCutoff: {
          //time: time,
          //formatCode: formatCode,
        //}
        'softCutoff.time.millis': time.millis,
        'softCutoff.time.decimals': time.decimals,
        'softCutoff.time.penalties': time.penalties,
        'softCutoff.formatCode': formatCode,
      };
    } else {
      toSet.$unset = {
        softCutoff: 1,
      };
    }

    Rounds.update({ _id: this._id }, toSet);
    template.$(".modal").modal('hide');
  },
});

Template.modalHardCutoff.created = function() {
  var template = this;
  template.isSaveableReact = new ReactiveVar(false);
  template.autorun(function() {
    var data = Template.currentData();
    template.isSaveableReact.set(!!data);
  });
};
Template.modalHardCutoff.events({
  'shown.bs.modal .modal': function(e, template) {
    // Focus first input when we become visible
    template.$('input').filter(':visible:first').focus();
    template.$('input').filter(':visible:first').select();
  },
  'solveTimeInput [name="inputHardCutoff"]': function(e, template, solveTime) {
    template.isSaveableReact.set(!!solveTime);
  },
  'submit form': function(e, template) {
    e.preventDefault();

    var $inputHardCutoff = template.$('[name="inputHardCutoff"]');
    var time = $inputHardCutoff.jChester('getSolveTime');

    Rounds.update({
      _id: this._id,
    }, {
      $set: {
        // Explicitly listing all the fields in SolveTime as a workaround for
        //  https://github.com/aldeed/meteor-simple-schema/issues/202
        //'hardCutoff.time': time
        'hardCutoff.time.millis': time.millis,
        'hardCutoff.time.decimals': time.decimals,
        'hardCutoff.time.penalties': time.penalties,
      }
    });

    template.$(".modal").modal('hide');
  },
});
Template.modalHardCutoff.helpers({
  isSaveable: function() {
    var template = Template.instance();
    return template.isSaveableReact.get();
  }
});

function getCompetitorsDoneAndTotal(roundId) {
  // Neutered until https://github.com/jfly/gjcomps/issues/81
  if(true) {
    return [ 5, 10 ];
  }
  var formatCode = getRoundAttribute(roundId, 'formatCode');
  var format = wca.formatByCode[formatCode];
  var expectedSolvesPerResult = format.count;

  var results = Results.find({
    roundId: roundId,
  }, {
    fields: {
      solves: 1,
    }
  }).fetch();

  var actualSolveCount = 0;
  _.each(results, function(result) {
    _.each(result.solves, function(solve) {
      if(solve.wcaValue !== 0) {
        // wcaValue of 0 means "nothing"
        actualSolveCount++;
      }
    });
  });
  if(actualSolveCount === 0) {
    return [ 0, results.length ];
  }

  // TODO - this doesn't take into account soft cutoffs
  var expectedSolveCount = results.length * expectedSolvesPerResult;
  var doneRatio = actualSolveCount / expectedSolveCount;
  return [ doneRatio*results.length, results.length ];
}

function getLastRoundResultsCount(competitionId, eventCode) {
  // Neutered until https://github.com/jfly/gjcomps/issues/81
  if(true) {
    return 1;
  }
  var roundId = getLastRoundIdForEvent(competitionId, eventCode);
  if(!roundId) {
    return false;
  }
  var resultsForRound = Results.find({
    roundId: roundId,
  }, {
    fields: {
      _id: 1,
    }
  });
  return resultsForRound.count();
}
function getMaxAllowedSize(round) {
  var prevRound = Rounds.findOne({
    competitionId: round.competitionId,
    eventCode: round.eventCode,
    nthRound: round.nthRound - 1,
  }, {
    fields: {
      status: 1,
      size: 1,
    }
  });
  if(!prevRound || !prevRound.size) {
    return null;
  }

  var maxAllowedRoundSize = Math.floor(prevRound.size*(1-wca.MINIMUM_CUTOFF_PERCENTAGE/100.0));
  return maxAllowedRoundSize;
}

var eventCountPerRowByDeviceSize = {
  xs: 1,
  sm: 2,
  md: 2,
  lg: 3,
};
Template.editCompetition.helpers({

  defaultCompetitionDataDocument: function() {
    var competitionId = this.competitionId;
    var competition = getCompetitionData(competitionId);

    if(competition) {
      return competition;
    } else {
      return {
        // any default values
      };
    }
  },

  events: function() {
    var that = this;
    var events = _.map(wca.events, function(e, i) {
      return {
        index: i,
        competitionId: that.competitionId,
        eventCode: e.code,
        eventName: e.name,
      };
    });
    return events;
  },
  eventColumnsClasses: function() {
    var classes = _.map(eventCountPerRowByDeviceSize, function(eventCount, deviceSize) {
      var cols = Math.floor(12 / eventCount);
      return "col-" + deviceSize + "-" + cols;
    });
    return classes.join(" ");
  },
  clearfixVisibleClass: function() {
    var that = this;
    var classes = _.map(eventCountPerRowByDeviceSize, function(eventCount, deviceSize) {
      if((that.index + 1) % eventCount === 0) {
        return 'visible-' + deviceSize + '-block';
      }
      return '';
    });
    return classes.join(" ");
  },

  rounds: function() {
    var rounds = Rounds.find({
      competitionId: this.competitionId,
      eventCode: this.eventCode
    }, {
      sort: {
        nthRound: 1
      }
    }).fetch();
    return rounds;
  },
  roundSoftCutoffAllowed: function() {
    if(!this.softCutoff) {
      return true;
    }
    var format = wca.formatByCode[this.formatCode];
    var allowedSoftCutoffFormatCodes = format.softCutoffFormatCodes;
    return _.contains(allowedSoftCutoffFormatCodes, this.softCutoff.formatCode);
  },
  isFirstRound: function() {
    return this.nthRound === 0;
  },
  competitorsRegisteredForEventCount: function() {
    var competitorsCount = Registrations.find({
      competitionId: this.competitionId,
      events: this.eventCode,
    }, {
      fields: {
        _id: 1
      }
    }).count();
    return competitorsCount;
  },
  roundDoneAndTotal: function() {
    return getCompetitorsDoneAndTotal(this._id);
  },
  maxAllowedRoundSize: function() {
    var maxAllowedRoundSize = getMaxAllowedSize(this);
    return maxAllowedRoundSize;
  },
  roundSizeWarning: function() {
    var maxAllowedRoundSize = getMaxAllowedSize(this);
    if(maxAllowedRoundSize === null) {
      return false;
    }
    return this.size > maxAllowedRoundSize;
  },
  roundComplete: function() {
    var done_total = getCompetitorsDoneAndTotal(this._id);
    return done_total[0] == done_total[1];
  },
  lastRoundResultsCount: function() {
    return getLastRoundResultsCount(this.competitionId, this.eventCode);
  },
  canRemoveRound: function() {
    var roundId = getLastRoundIdForEvent(this.competitionId, this.eventCode);
    if(!roundId) {
      return false;
    }
    return canRemoveRound(Meteor.userId(), roundId);
  },
  canAddRound: function() {
    return canAddRound(Meteor.userId(), this.competitionId, this.eventCode);
  },
  formats: function() {
    return wca.formatsByEventCode[this.eventCode];
  },
  scheduleDescription: function() {
    var startDate = getCompetitionStartDateMoment(this.competitionId);
    if(!startDate) {
      return "Unscheduled";
    }
    var endDate = getCompetitionEndDateMoment(this.competitionId);
    assert(endDate);
    var formatStr = "MMMM D, YYYY";
    var rangeStr = $.fullCalendar.formatRange(startDate, endDate, formatStr);
    return startDate.fromNow() + " (" + rangeStr + ")";
  },
  roundOpen: function() {
    return this.status == wca.roundStatuses.open;
  },
  canCloseRound: function() {
    return this.status == wca.roundStatuses.open;
  },
  canOpenRound: function() {
    var nextRound = Rounds.findOne({
      competitionId: this.competitionId,
      eventCode: this.eventCode,
      nthRound: this.nthRound + 1,
    }, {
      fields: {
        status: 1,
      }
    });
    if(nextRound && nextRound.status != wca.roundStatuses.unstarted) {
      // If there's a next round that is already opened (or
      // closed), we can't reopen this round.
      return false;
    }
    if(this.status == wca.roundStatuses.unstarted) {
      var results = Results.find({
        roundId: this._id,
      }, {
        fields: {
          _id: 1,
        }
      });
      // Only allow opening this unstarted round if there are some people *in*
      // the round.
      return results.count() > 0;
    }
    return this.status == wca.roundStatuses.closed;
  },
  canAdvanceRound: function() {
    if(this.status != wca.roundStatuses.closed) {
      // We only allow advancing from rounds when they are closed
      return false;
    }
    var nextRound = Rounds.findOne({
      competitionId: this.competitionId,
      eventCode: this.eventCode,
      nthRound: this.nthRound + 1,
    }, {
      fields: {
        status: 1
      }
    });
    if(!nextRound) {
      // We can't possibly advance people from this round if there is no next
      // round.
      return false;
    }
    return true;
  },
  isCurrentRoundFormat: function() {
    var round = Template.parentData(1);
    var formatCode = this.toString();
    return round.formatCode == formatCode;
  },
  lastRoundCode: function() {
    var roundId = getLastRoundIdForEvent(this.competitionId, this.eventCode);
    return getRoundAttribute(roundId, 'roundCode');
  },
  roundPopup: function() {
    return roundPopupReact.get();
  },
});

function getEnteredUniqueName(template) {
  var nameInput = template.find('input[name="name"]');
  return nameInput.value;
}

function getSelectedUserRegistration(template) {
  var uniqueName = getEnteredUniqueName(template);
  var registration = Registrations.findOne({ uniqueName: uniqueName });
  return registration;
}

function maybeEnableUserSelectForm(template) {
  var registration = getSelectedUserRegistration(template);
  var $submit = template.$('button[name="buttonAddUser"]');
  $submit.prop("disabled", !registration);
}

Template.editCompetition_users.events({
  'input input[name="name"]': function(e, template) {
    maybeEnableUserSelectForm(template);
  },
  'typeahead:selected input[name="name"]': function(e, template) {
    maybeEnableUserSelectForm(template);
  },
  'typeahead:autocompleted input[name="name"]': function(e, template) {
    maybeEnableUserSelectForm(template);
  },
  'click button[name="buttonRemoveUser"]': function(e, template) {
    var registration = this;
    var $pull = {};
    $pull[template.data.userIdsAtribute] = registration.userId;
    Competitions.update({
      _id: template.data.competitionId
    }, {
      $pull: $pull
    });
  },
  'submit form': function(e, template) {
    e.preventDefault();

    var registration = getSelectedUserRegistration(template);
    if(!registration) {
      // This should never happen, because we only enable
      // submission when the input is valid (ie: the input maps to a registration).
      log.l0("Could not find registration for:", getEnteredUniqueName(template));
      return;
    }
    var $addToSet = {};
    $addToSet[this.userIdsAtribute] = registration.userId;
    Competitions.update({
      _id: this.competitionId
    }, {
      $addToSet: $addToSet
    });

    // Clear name input and close typeahead dialog
    var $nameInput = template.$('input[name="name"]');
    $nameInput.typeahead('val', '');
    maybeEnableUserSelectForm(template);
  },
});

Template.editCompetition_users.rendered = function() {
  var template = this;

  var registrations = [];
  template.autorun(function() {
    var competitionId = Template.currentData().competitionId;
    registrations = Registrations.find({
      competitionId: competitionId,
    }, {
      fields: {
        uniqueName: 1,
      }
    }).fetch();
    maybeEnableUserSelectForm(template);
  });

  template.$('.typeahead').typeahead({
    hint: true,
    highlight: true,
    minLength: 1
  }, {
    name: 'registrations',
    displayKey: function(registration) {
      return registration.uniqueName;
    },
    source: substringMatcher(function() { return registrations; }, 'uniqueName'),
  });
};

Template.editCompetition_users.helpers({
  registrations: function() {
    // TODO - sort by name?
    var fields = {};
    fields[this.userIdsAtribute] = 1;
    var competition = Competitions.findOne({
      _id: this.competitionId
    }, {
      fields: fields,
    });
    if(!competition || !competition[this.userIdsAtribute]) {
      return [];
    }
    return Registrations.find({
      competitionId: this.competitionId,
      userId: {
        $in: competition[this.userIdsAtribute]
      }
    });
  },
  isCurrentUser: function() {
    return Meteor.userId() == this.userId;
  }
});

Template.editCompetition_userRow.helpers({
  isMe: function() {
    return this.userId == Meteor.userId();
  },
});
