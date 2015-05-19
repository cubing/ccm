var roundPopupReact = new ReactiveVar(null);

Template.editEvents.events({
  'click button[name="buttonAddRound"]': function(e, template) {
    Meteor.call('addRound', this.competitionId, this.eventCode);
  },
  'click button[name="buttonRemoveRound"]': function(e, template) {
    var lastRoundId = getLastRoundIdForEvent(this.competitionId, this.eventCode);
    var progress = RoundProgresses.findOne({roundId: lastRoundId});
    if(progress.total > 0) {
      $("#modalReallyRemoveRound_" + this.eventCode).modal('show');
    } else {
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
    Rounds.update({ _id: this._id }, { $set: { status: wca.roundStatuses.open } });
  },
  'click button[name="buttonCloseRound"]': function(e, template) {
    Rounds.update({ _id: this._id }, { $set: { status: wca.roundStatuses.closed } });
  },
  'change select[name="roundFormat"]': function(e) {
    var select = e.currentTarget;
    var formatCode = select.value;
    var roundId = this._id;
    Rounds.update({ _id: roundId }, { $set: { formatCode: formatCode } });
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
    // via passing hide:true. You can't just call collapse('hide') because when
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
    return Rounds.find({
      competitionId: this.competitionId,
      eventCode: this.eventCode
    }, {
      sort: { nthRound: 1 }
    }).fetch();
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
      fields: { _id: 1 }
    }).count();
    return participantsCount;
  },
  roundProgress: function() {
    return RoundProgresses.findOne({roundId: this._id});
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
    var progress = RoundProgresses.findOne({roundId: this._id});
    return progress.isComplete();
  },
  roundOvercomplete: function() {
    var progress = RoundProgresses.findOne({roundId: this._id});
    return progress.isOverComplete();
  },
  lastRoundResultsCount: function() {
    var lastRoundId = getLastRoundIdForEvent(this.competitionId, this.eventCode);
    if(!lastRoundId) {
      return 0;
    }
    var progress = RoundProgresses.findOne({roundId: lastRoundId});
    return progress.total;
  },
  canRemoveRound: function() {
    var lastRoundId = getLastRoundIdForEvent(this.competitionId, this.eventCode);
    if(!lastRoundId) {
      return false;
    }
    return canRemoveRound(Meteor.userId(), lastRoundId);
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
      fields: { status: 1 }
    });
    if(nextRound && !nextRound.isUnstarted()) {
      // If there's a next round that is already opened (or
      // closed), we can't reopen this round.
      return false;
    }
    if(this.status == wca.roundStatuses.unstarted) {
      var progress = RoundProgresses.findOne({roundId: this._id});
      // We always create and delete WCA Rounds and RoundProgresses together,
      // but when deleting a Round, there's a window where this helper gets called,
      // so we first make sure progress exists before we use it.
      if(progress) {
        // Only allow opening this unstarted round if there are some people *in*
        // the round.
        return progress.total > 0;
      }
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
      fields: { status: 1 }
    });
    if(!nextRound) {
      // We can't advance people from the final round
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
    return Rounds.findOne(roundId).roundCode;
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
    Rounds.update({ _id: this._id }, toSet);
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

    var softCutoff = {};
    if(formatCode) {
      var $inputSoftCutoff = template.$('[name="inputSoftCutoff"]');
      var time = $inputSoftCutoff.jChester('getSolveTime');
      softCutoff = {
        time: time,
        formatCode: formatCode,
      };
    } else {
      softCutoff = null;
    }

    var roundId = this._id;
    Meteor.call('setRoundSoftCutoff', roundId, softCutoff, function(err, result) {
      if(!err) {
        template.$(".modal").modal('hide');
      }
    });
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
