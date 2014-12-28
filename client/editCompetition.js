var log = logging.handle("editCompetition");

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
