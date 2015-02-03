var roundPopupReact = new ReactiveVar(null);

Template.editEvents.events({
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
  },
  'show.bs.collapse .collapse': function(e) {
    localStorage[this.eventCode + "visible"] = true;
  },
  'hide.bs.collapse .collapse': function(e) {
    delete localStorage[this.eventCode + "visible"];
  },
  'click #collapseAllEvents': function() {
    // While it looks weird to method chain collapse, I couldn't get it to work
    // via passing hide:tru. You can't just call collapse('hide') because when
    // you  manually call collapse() it defaults to toggling the element.
    $('#editEventsList .collapse').collapse({toggle:false}).collapse('hide');
  },
  'click #expandAllEvents': function() {
    $('#editEventsList .collapse').collapse({toggle:false}).collapse('show');
  },
});

var eventCountPerRowByDeviceSize = {
  xs: 1,
  sm: 2,
  md: 2,
  lg: 3,
};

function getParticipantsDoneAndTotal(roundId) {
  // Neutered until https://github.com/cubing/ccm/issues/81
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
      if(solve) {
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
  // Neutered until https://github.com/cubing/ccm/issues/81
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

Template.editEvents.helpers({
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
  participantsRegisteredForEventCount: function() {
    var participantsCount = Registrations.find({
      competitionId: this.competitionId,
      events: this.eventCode,
    }, {
      fields: {
        _id: 1
      }
    }).count();
    return participantsCount;
  },
  roundDoneAndTotal: function() {
    return getParticipantsDoneAndTotal(this._id);
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
    var done_total = getParticipantsDoneAndTotal(this._id);
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
      var done_total = getParticipantsDoneAndTotal(this._id);
      // Only allow opening this unstarted round if there are some people *in*
      // the round.
      return done_total[1] > 0;
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
  showEvent: function() {
    return !!localStorage[this.eventCode + "visible"];
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

    var toSet = {};
    if(formatCode) {
      var $inputSoftCutoff = template.$('[name="inputSoftCutoff"]');
      var time = $inputSoftCutoff.jChester('getSolveTime');

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

    var roundId = this._id;
    Rounds.update(roundId, toSet);

    // Adding/removing a soft cutoff for a round makes a round a
    // combined/uncombined round. Perhaps we should create a meteor
    // method for changing the softcutoff of a round in order to encapsulate
    // this logic.
    var eventCode = getRoundAttribute(roundId, 'eventCode');
    var competitionId = getRoundAttribute(roundId, 'competitionId');
    Meteor.call('refreshRoundCodes', competitionId, eventCode);

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
