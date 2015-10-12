Template.roundPicker.created = function() {
  var template = this;
  template.selectedEventCodeReact = new ReactiveVar(null);
  template.autorun(function() {
    var data = Template.currentData();
    var currentRoundId = data.roundId;

    var newEventCode = null;
    if(currentRoundId) {
      newEventCode = Rounds.findOne(currentRoundId).eventCode;
    } else if(data.eventCode) {
      newEventCode = data.eventCode;
    }
    template.selectedEventCodeReact.set(newEventCode);
  });
};

Template.roundPicker.events({
  'click a.eventLink': function(e, template) {
    template.selectedEventCodeReact.set(this.eventCode);
  },
});

Template.roundPicker.helpers({
  isCurrentEvent: function() {
    var template = Template.instance();
    return this.eventCode == template.selectedEventCodeReact.get();
  },

  selectedEventCode: function() {
    var template = Template.instance();
    return template.selectedEventCodeReact.get();
  },
  roundsForEvent: function() {
    var template = Template.instance();
    var rounds = Rounds.find({
      competitionId: this.competitionId,
      eventCode: template.selectedEventCodeReact.get(),
    }, {
      sort: { nthRound: 1 }
    });
    return rounds;
  },
  isCurrentRound: function() {
    var roundData = Template.parentData(1);
    var currentRoundId = roundData.roundId;
    if(!currentRoundId) {
      return false;
    }
    var currentRound = Rounds.findOne(currentRoundId);
    var template = Template.instance();
    var selectedEventCode = template.selectedEventCodeReact.get();
    if(selectedEventCode != currentRound.eventCode) {
      return false;
    }

    return this.nthRound == currentRound.nthRound;
  },
});

Template.openRoundPicker.created = function() {
  var template = this;
  template.showAllRoundsReact = new ReactiveVar(false);
};

Template.openRoundPicker.helpers({
  showAllRounds: function() {
    if(!this.allowChosingClosedRounds) {
      return false;
    }
    if(this.roundId) {
      if(!Rounds.findOne(this.roundId).isOpen()) {
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

Template.openRoundPicker.events({
  'click #showAllRoundsLink': function(e, template) {
    e.preventDefault();
    template.showAllRoundsReact.set(!template.showAllRoundsReact.get());
  },
});
