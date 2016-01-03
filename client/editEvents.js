let roundPopupReact = new ReactiveVar(null);

Template.editEvents.events({
  'click button[name="buttonAddRound"]': function(e, template) {
    Meteor.call('addRound', this.competitionId, this.eventCode);
  },
  'click button[name="buttonRemoveRound"]': function(e, template) {
    let competition = Competitions.findOne(this.competitionId);
    let lastRound = competition.getLastRoundOfEvent(this.eventCode);
    let progress = RoundProgresses.findOne({roundId: lastRound._id});
    if(progress.total > 0) {
      $("#modalReallyRemoveRound_" + this.eventCode).modal('show');
    } else {
      Meteor.call('removeLastRound', this.competitionId, this.eventCode);
    }
  },
  'click button[name="buttonReallyRemoveRound"]': function(e, template) {
    $("#modalReallyRemoveRound_" + this.eventCode).modal('hide');
    Meteor.call('removeLastRound', this.competitionId, this.eventCode);
  },
  'click button[name="buttonOpenRound"]': function(e, template) {
    Rounds.update(this._id, { $set: { status: wca.roundStatuses.open } });
  },
  'click button[name="buttonCloseRound"]': function(e, template) {
    let roundProgress = RoundProgresses.findOne({roundId: this._id});
    // When closing a round, set it to unstarted if nobody has any results yet.
    let newRoundStatus = roundProgress.done === 0 ? wca.roundStatuses.unstarted : wca.roundStatuses.closed;
    Rounds.update(this._id, { $set: { status: newRoundStatus } });
  },
  'change select[name="roundFormat"]': function(e) {
    let select = e.currentTarget;
    let formatCode = select.value;
    let roundId = this._id;
    Rounds.update(roundId, { $set: { formatCode: formatCode } });
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
    localStorage[this.competitionId + this.eventCode + "visible"] = true;
  },
  'hide.bs.collapse .collapse': function(e) {
    delete localStorage[this.competitionId + this.eventCode + "visible"];
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

let deviceSizeAndEventCounts = [
  ['xs', 1],
  ['sm', 2],
  ['md', 2],
  ['lg', 3],
];

Template.editEvents.helpers({
  events: function() {
    let events = wca.events.map((e, i) => {
      return {
        index: i,
        competitionId: this.competitionId,
        eventCode: e.code,
        eventName: e.name,
      };
    });
    return events;
  },
  eventColumnsClasses: function() {
    let classes = deviceSizeAndEventCounts.map(([deviceSize, eventCount]) => {
      let cols = Math.floor(12 / eventCount);
      return "col-" + deviceSize + "-" + cols;
    });
    return classes.join(" ");
  },
  clearfixVisibleClass: function() {
    let classes = deviceSizeAndEventCounts.map(([deviceSize, eventCount]) => {
      if((this.index + 1) % eventCount === 0) {
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
    let format = wca.formatByCode[this.formatCode];
    let allowedSoftCutoffFormatCodes = format.softCutoffFormatCodes;
    return _.contains(allowedSoftCutoffFormatCodes, this.softCutoff.formatCode);
  },
  isFirstRound: function() {
    return this.nthRound === 1;
  },
  participantsRegisteredForEventCount: function() {
    let participantsCount = Registrations.find({
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
  roundSizeWarning: function() {
    let maxAllowedRoundSize = this.getMaxAllowedSize();
    if(maxAllowedRoundSize === null) {
      return false;
    }
    return this.size > maxAllowedRoundSize;
  },
  progressClasses: function() {
    let progress = RoundProgresses.findOne({roundId: this._id});
    let classes = "progress-bar-" + {incomplete: "warning", complete: "success", overcomplete: "danger"}[progress.completeness()];
    if(this.isOpen()) {
      classes += " progress-bar-striped active";
    }
    return classes;
  },
  percentage: function(progress) {
    return progress.percentage();
  },
  lastRoundResultsCount: function() {
    let competition = Competitions.findOne(this.competitionId);
    let lastRound = competition.getLastRoundOfEvent(this.eventCode);
    if(!lastRound) {
      return 0;
    }
    let progress = RoundProgresses.findOne({roundId: lastRound._id});
    return progress.total;
  },
  canRemoveRound: function() {
    let competition = Competitions.findOne(this.competitionId);
    let lastRound = competition.getLastRoundOfEvent(this.eventCode);
    if(!lastRound) {
      return false;
    }
    return canRemoveRound(Meteor.userId(), lastRound._id);
  },
  canAddRound: function() {
    return canAddRound(Meteor.userId(), this.competitionId, this.eventCode);
  },
  formats: function() {
    return wca.formatsByEventCode[this.eventCode];
  },
  canManageGroupsForRound: function() {
    return this.isOpen();
  },
  canCloseRound: function() {
    return this.isOpen();
  },
  canOpenRound: function() {
    let previousRound = this.getPreviousRound();
    if(previousRound && !previousRound.isClosed()) {
      // If the previous round is not closed, we can't open this round.
      return false;
    }
    let nextRound = this.getNextRound();
    if(nextRound && !nextRound.isUnstarted()) {
      // If there's a next round that is already opened (or
      // closed), we can't reopen this round.
      return false;
    }
    if(this.isUnstarted()) {
      let progress = RoundProgresses.findOne({roundId: this._id});
      // We always create and delete WCA Rounds and RoundProgresses together,
      // but when deleting a Round, there's a window where this helper gets called,
      // so we first make sure progress exists before we use it.
      if(progress) {
        // Only allow opening this unstarted round if there are some people *in*
        // the round.
        return progress.total > 0;
      }
    }
    return this.isClosed();
  },
  canAdvanceRound: function() {
    if(!this.isClosed()) {
      // We only allow advancing from rounds when they are closed
      return false;
    }
    // We can't advance people from the final round
    return !this.isLast();
  },
  isCurrentRoundFormat: function() {
    let round = Template.parentData(1);
    let formatCode = this.toString();
    return round.formatCode == formatCode;
  },
  lastRoundCode: function() {
    let competition = Competitions.findOne(this.competitionId);
    let lastRound = competition.getLastRoundOfEvent(this.eventCode);
    return lastRound.roundCode();
  },
  roundPopup: function() {
    return roundPopupReact.get();
  },
  showEvent: function() {
    return !!localStorage[this.competitionId + this.eventCode + "visible"];
  },
});

Template.modalSetRoundSize.created = function() {
  let template = this;
  template.isSaveableReact = new ReactiveVar(false);
  template.autorun(function() {
    let data = Template.currentData();
    template.isSaveableReact.set(!!data);
  });
};
Template.modalSetRoundSize.helpers({
  isSaveable: function() {
    let template = Template.instance();
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

    let $input = $('input[name="roundSize"]');
    let sizeStr = $input.val();
    let toSet = {};
    if(sizeStr) {
      let size = parseInt(sizeStr);
      toSet.$set = { size: size };
    } else {
      toSet.$unset = { size: 1 };
    }
    Rounds.update(this._id, toSet);
    template.$(".modal").modal('hide');
  },
});

Template.modalSoftCutoff.created = function() {
  let template = this;
  template.showTimeEntryReact = new ReactiveVar(false);
  template.isSaveableReact = new ReactiveVar(false);
  template.autorun(function() {
    let data = Template.currentData();
    template.showTimeEntryReact.set(data && data.softCutoff);
    template.isSaveableReact.set(!!data);
  });
};
Template.modalSoftCutoff.helpers({
  softCutoffFormats: function() {
    return wca.softCutoffFormats;
  },
  isCurrentSoftCutoffFormat: function() {
    let round = Template.parentData(1);
    if(!round.softCutoff) {
      return false;
    }
    let softCutoffFormatCode = this.code;
    return round.softCutoff.formatCode == softCutoffFormatCode;
  },
  isAllowedSoftCutoffFormat: function() {
    let round = Template.parentData(1);
    let roundFormat = wca.formatByCode[round.formatCode];
    let softCutoffFormatCode = this.code;
    return _.contains(roundFormat.softCutoffFormatCodes, softCutoffFormatCode);
  },
  showTimeEntry: function() {
    let template = Template.instance();
    return template.showTimeEntryReact.get();
  },
  isSaveable: function() {
    let template = Template.instance();
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
    let select = e.currentTarget;
    let softCutoffFormatCode = select.value;
    template.showTimeEntryReact.set(!!softCutoffFormatCode);
  },
  'solveTimeInput [name="inputSoftCutoff"]': function(e, template, solveTime) {
    template.isSaveableReact.set(!!solveTime);
  },
  'submit form': function(e, template) {
    e.preventDefault();

    let $selectCutoffFormat = template.$('select[name="softCutoffFormatCode"]');
    let formatCode = $selectCutoffFormat.val();

    let softCutoff = {};
    if(formatCode) {
      let $inputSoftCutoff = template.$('[name="inputSoftCutoff"]');
      let time = $inputSoftCutoff.jChester('getSolveTime');
      softCutoff = {
        time: time,
        formatCode: formatCode,
      };
    } else {
      softCutoff = null;
    }

    let roundId = this._id;
    Meteor.call('setRoundSoftCutoff', roundId, softCutoff, function(err, result) {
      if(!err) {
        template.$(".modal").modal('hide');
      } else {
        console.error("Meteor.call() error: " + err);
      }
    });
  },
});

Template.modalHardCutoff.created = function() {
  let template = this;
  template.isSaveableReact = new ReactiveVar(false);
  template.autorun(function() {
    let data = Template.currentData();
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

    let $inputHardCutoff = template.$('[name="inputHardCutoff"]');
    let time = $inputHardCutoff.jChester('getSolveTime');

    Rounds.update(this._id, {
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
    let template = Template.instance();
    return template.isSaveableReact.get();
  }
});
