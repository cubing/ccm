Template.advanceParticipants.created = function() {
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
      var participantsInRound = Results.find({
        roundId: nextRound._id,
      }, {
        fields: {
          _id: 1,
        }
      }).count();
      template.advanceCountReact.set(nextRound.size || participantsInRound || null);
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
Template.advanceParticipants.events({
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
    Meteor.call('advanceParticipantsFromRound', advanceCount, this.roundId, function(err, data) {
      if(err) {
        throw err;
      }
      template.$(".modal").modal('hide');
    });
  },
});
Template.advanceParticipants.helpers({
  isSaveable: function() {
    var template = Template.instance();
    return template.isSaveableReact.get();
  },
  participantsInRound: function() {
    var participantCount = Results.find({
      roundId: this.roundId,
    }).count();
    return participantCount;
  },
  advanceCount: function() {
    var template = Template.instance();
    return template.advanceCountReact.get();
  },
});

