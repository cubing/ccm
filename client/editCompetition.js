Template.editCompetition.events({
  'input input[type="text"]': function(e) {
    var attribute = e.currentTarget.name;
    var value = e.currentTarget.value;
    var toSet = {};
    toSet[attribute] = value;
    Competitions.update({ _id: this._id }, { $set: toSet });
  },
  'change input[type="checkbox"]': function(e) {
    var attribute = e.currentTarget.name;
    var value = e.currentTarget.checked;
    var toSet = {};
    toSet[attribute] = value;
    Competitions.update({ _id: this._id }, { $set: toSet });
  },
  'click .event .btn': function(e, t) {
    var button = $(e.currentTarget);
    button.toggleClass("collapsed");
  }
});

Template.editCompetition.helpers({
  events: function() {
    var competitionId = this._id;
    return _.map(_.toArray(wca.eventByCode), function(e) {
      return {
        competitionId: competitionId,
        eventCode: e.code,
        eventName: e.name
      };
    });
  },

  rounds: function() {
    var rounds = Rounds.find(
      { competitionId: this.competitionId, eventCode: this.eventCode }
    );
    return rounds;
  }
});

function getSelectedUser(t) {
  var nameInput = t.find('input[name="name"]');
  var username = getNameAndUsernameFromUserString(nameInput.value)[1];
  var user = Meteor.users.findOne({
    'username': username
  });
  return user;
}

function maybeEnableUserSelectForm(t) {
  var user = getSelectedUser(t);
  var $submit = t.$('button[name="buttonAddUser"]');
  $submit.prop("disabled", !user);
}

Template.editCompetition_users.events({
  'input input[name="name"]': function(e, t) {
    maybeEnableUserSelectForm(t);
  },
  'typeahead:selected input[name="name"]': function(e, t) {
    maybeEnableUserSelectForm(t);
  },
  'typeahead:autocompleted input[name="name"]': function(e, t) {
    maybeEnableUserSelectForm(t);
  },
  'click button[name="buttonRemoveUser"]': function(e, t) {
    var user = this;
    var $pull = {};
    $pull[t.data.userIdsAtribute] = user._id;
    Competitions.update({
      _id: t.data.competitionId
    }, {
      $pull: $pull
    });
  },
  'submit form': function(e, t) {
    e.preventDefault();

    var user = getSelectedUser(t);
    if(!user) {
      // This should never happen, because we only enable
      // submission when the input is valid (ie: the input maps to a user).
      return;
    }
    var $addToSet = {};
    $addToSet[this.userIdsAtribute] = user._id;
    Competitions.update({
      _id: this.competitionId
    }, {
      $addToSet: $addToSet
    });

    // Clear name input and close typeahead dialog
    var $nameInput = t.$('input[name="name"]');
    $nameInput.typeahead('val', '');
    maybeEnableUserSelectForm(t);
  }
});

function getNameAndUsernameFromUserString(userStr) {
  var match = userStr.match(/([^(]*)(?:\((.*)\))?/);
  var name = match[1].trim();
  var id = match[2];
  return [ name, id ];
}

Template.editCompetition_users.rendered = function() {
  var substringMatcher = function(collection, attributes) {
    return function findMatches(q, cb) {
      var name = getNameAndUsernameFromUserString(q)[0];
      var seenIds = {};
      var arr = [];
      var addResult = function(result) {
        if(seenIds[result._id]) {
          return;
        }
        seenIds[result._id] = true;
        arr.push(result);
      };

      _.each([true, false], function(startOfWordMatch) {
        _.each(attributes, function(attribute) {
          var findParams = {};
          var $regex;
          if(startOfWordMatch) {
            $regex = "\\b" + RegExp.escape(name);
          } else {
            $regex = RegExp.escape(name);
          }
          findParams[attribute] = {
            $regex: $regex,
            $options: 'i'
          };
          var results = collection.find(findParams).fetch();
          for(var i = 0; i < results.length; i++) {
            addResult(results[i]);
          }
        });
      });

      cb(arr);
    };
  };

  this.$('.typeahead').typeahead({
    hint: true,
    highlight: true,
    minLength: 1
  }, {
    name: 'users',
    displayKey: function(user) {
      return user.profile.name + " (" + user.username + ")";
    },
    source: substringMatcher(Meteor.users, [ 'profile.name', 'username' ]),
  });

  maybeEnableUserSelectForm(this);
};

Template.editCompetition_users.helpers({
  users: function() {
    // TODO - sort by name?
    var comp = Competitions.findOne({ _id: this.competitionId });
    if(!comp || !comp[this.userIdsAtribute]) {
      return [];
    }
    return Meteor.users.find({
      _id: {
        $in: comp[this.userIdsAtribute]
      }
    });
  },
  isCurrentUser: function() {
    return Meteor.userId() == this._id;
  }
});
