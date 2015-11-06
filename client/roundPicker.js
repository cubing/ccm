Template.roundPicker.created = function() {
  let template = this;
  template.selectedEventCodeReact = new ReactiveVar(null);
  template.autorun(function() {
    let data = Template.currentData();
    let currentRoundId = data.roundId;

    let newEventCode = null;
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
  competition() {
    return Competitions.findOne(this.competitionId);
  },

  isCurrentEvent() {
    let template = Template.instance();
    return this == template.selectedEventCodeReact.get();
  },

  selectedEventCode() {
    let template = Template.instance();
    return template.selectedEventCodeReact.get();
  },

  roundsForEvent() {
    let template = Template.instance();
    let rounds = Rounds.find({
      competitionId: this.competitionId,
      eventCode: template.selectedEventCodeReact.get(),
    }, {
      sort: { nthRound: 1 }
    });
    return rounds;
  },

  isCurrentRound() {
    let roundData = Template.parentData(1);
    let currentRoundId = roundData.roundId;
    if(!currentRoundId) {
      return false;
    }
    let currentRound = Rounds.findOne(currentRoundId);
    let template = Template.instance();
    let selectedEventCode = template.selectedEventCodeReact.get();
    if(selectedEventCode != currentRound.eventCode) {
      return false;
    }

    return this.nthRound == currentRound.nthRound;
  },
});

Template.openRoundPicker.created = function() {
  let template = this;
  template.showAllRoundsReact = new ReactiveVar(false);
};

Template.openRoundPicker.helpers({
  showAllRounds() {
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

    let template = Template.instance();
    return template.showAllRoundsReact.get();
  },

  openRounds() {
    let openRounds = Rounds.find({
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

  isSelectedRound() {
    let data = Template.parentData(1);
    let selectedRoundId = data.roundId;
    return selectedRoundId == this._id;
  },

  selectedRound() {
    let data = Template.parentData(1);
    return Rounds.findOne(data.roundId);
  },
});

Template.openRoundPicker.events({
  'click #showAllRoundsLink': function(e, template) {
    e.preventDefault();
    template.showAllRoundsReact.set(!template.showAllRoundsReact.get());
  },
});
