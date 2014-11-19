var inputChangeDep = new Deps.Dependency();
var unsavedChangesReact = new ReactiveVar(false);

function isRegisteredForEvent(userId, eventCode, competitionId) {
  var firstRound = Rounds.findOne({
    competitionId: competitionId,
    eventCode: eventCode,
    nthRound: 0, // first round for event
  }, {
    fields: {
      _id: 1,
    }
  });
  assert(firstRound);
  var result = Results.findOne({
    competitionId: competitionId,
    roundId: firstRound._id,
    userId: userId,
  });
  return !!result;
}

Template.competitionRegistration.rendered = function() {
  var template = this;
  template.autorun(function() {
    var data = Template.currentData();
    inputChangeDep.depend();

    var userId = Meteor.userId();
    var competitionId = data.competitionId;

    var checkboxes = template.findAll('input[name="eventCode"]');
    var editedCheckboxes = _.filter(checkboxes, function(checkbox) {
      var eventCode = checkbox.value;
      var isWantsToBeRegisteredForEvent = checkbox.checked;
      var isActuallyRegisteredForEvent = isRegisteredForEvent(userId, eventCode, competitionId);
      return isWantsToBeRegisteredForEvent != isActuallyRegisteredForEvent;
    });
    unsavedChangesReact.set(editedCheckboxes.length > 0);
  });
};

Template.competitionRegistration.helpers({
  registeredForEvent: function() {
    var userId = Meteor.userId();
    var eventCode = this.eventCode;
    var competitionId = this.competitionId;
    return isRegisteredForEvent(userId, eventCode, competitionId);
  },
  unsavedChanges: function() {
    return unsavedChangesReact.get();
  },
});

Template.competitionRegistration.events({
  'click #registerButton': function(e, t) {
    e.preventDefault();

    var $checkedBoxes = t.$('input[name="eventCode"]:checked');
    var eventCodes = [];
    $checkedBoxes.each(function() {
      eventCodes.push($(this).val());
    });
    Meteor.call("registerForCompetition", this.competitionId, eventCodes);
  },
  'click #unregisterButton': function(e, t) {
    e.preventDefault();
    // To unregister, just set our eventCodes list to empty
    Meteor.call("registerForCompetition", this.competitionId, []);
    $('#modalConfirmDeregistration').modal('hide');
  },
  'change input': function(e, t) {
    inputChangeDep.changed();
  },
});
