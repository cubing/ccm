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
      fields: {
        roundCode: 1,
        eventCode: 1,
        nthRound: 1,
      },
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


