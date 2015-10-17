Template.advanceParticipants.created = function() {
  let template = this;

  template.advanceCountReact = new ReactiveVar(null);
  template.autorun(function() {
    let data = Template.currentData();
    if(!data) {
      template.advanceCountReact.set(null);
      return;
    }

    let round = Rounds.findOne(data.roundId);
    let nextRound = round.getNextRound();
    let actuallyAdvancedCount = Results.find({
      roundId: round._id,
      advanced: true,
    }).count();
    template.advanceCountReact.set(actuallyAdvancedCount || nextRound.size);
  });

  template.isSaveableReact = new ReactiveVar(false);
  template.autorun(function() {
    let data = Template.currentData();
    if(!data) {
      template.isSaveableReact.set(null);
      return;
    }
    template.isSaveableReact.set(template.advanceCountReact.get());
  });
};
Template.advanceParticipants.events({
  'shown.bs.modal .modal': function(e, template) {
    // Focus first input when we become visible
    template.$('input').filter(':visible:first').focus();
    template.$('input').filter(':visible:first').select();
  },
  'input input[name="advanceCount"]': function(e, template) {
    let $input = $(e.currentTarget);
    let advanceCountStr = $input.val();
    let isNonNegInt = String.isNonNegInt(advanceCountStr);
    if(isNonNegInt) {
      let advanceCount = parseInt(advanceCountStr);
      template.advanceCountReact.set(advanceCount);
    } else {
      template.advanceCountReact.set(null);
    }
  },
  'submit form': function(e, template) {
    e.preventDefault();

    let advanceCount = template.advanceCountReact.get();
    Meteor.call('advanceParticipantsFromRound', advanceCount, this.roundId, function(error, result) {
      if(!error) {
        template.$(".modal").modal('hide');
      } else {
        bootbox.alert(`Error! ${error.reason}`);
      }
    });
  },
});

Template.advanceParticipants.helpers({
  isSaveable: function() {
    let template = Template.instance();
    return template.isSaveableReact.get();
  },
  btnClass: function() {
    let template = Template.instance();
    let toAdvanceCount = template.advanceCountReact.get();
    let round = Rounds.findOne(this.roundId);
    let maxAllowed = round.getMaxAllowedToAdvanceCount();
    if(toAdvanceCount > maxAllowed) {
      return "btn-warning";
    } else if(template.isSaveableReact.get()) {
      return "btn-success";
    }
    return "";
  },
  tooltip: function() {
    let template = Template.instance();
    let toAdvanceCount = template.advanceCountReact.get();
    let round = Rounds.findOne(this.roundId);
    let maxAllowed = round.getMaxAllowedToAdvanceCount();
    if(toAdvanceCount > maxAllowed) {
      return `According to regulation 9p1, you should not advance more than ${maxAllowed} competitors from this round.`;
    } else {
      return "";
    }
  },
  participantsInRound: function() {
    return Results.find({ roundId: this.roundId }).count();
  },
  advanceCount: function() {
    let template = Template.instance();
    return template.advanceCountReact.get();
  },
});
