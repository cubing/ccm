Template.editCompetition.events({
  'input input': function(e) {
    var attribute = e.currentTarget.name;
    var value = e.currentTarget.value;
    var toSet = {};
    toSet[attribute] = value;
    Competitions.update({ _id: this._id }, { $set: toSet });
  },
  'change input': function(e) {
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
  eventList: function() {
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

function maybeEnableUserSelectForm(t) {
  var nameInput = t.find('input[name="name"]');
  var user = Meteor.users.findOne({
    'profile.name': nameInput.value
  });
  var $submit = t.$('button');
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
  'submit form': function(e) {
    console.log(e);//<<<
    e.preventDefault();
  }
});

Template.editCompetition_users.rendered = function() {
  var substringMatcher = function(collection, attribute) {
    return function findMatches(q, cb) {
      var findParams = {};
      findParams[attribute] = {
        $regex: q,
        $options: 'i'
      };
      var allResults = collection.find(findParams).fetch();

      findParams[attribute].$regex = "\\b" + q;
      var preferredResults = collection.find(findParams).fetch();

      var seenIds = {};
      var arr = [];
      var addResult = function(result) {
        if(seenIds[result._id]) {
          return;
        }
        seenIds[result._id] = true;
        arr.push(result);
      };
      var i;
      for(i = 0; i < preferredResults.length; i++) {
        addResult(preferredResults[i]);
      }
      for(i = 0; i < allResults.length; i++) {
        addResult(allResults[i]);
      }
      cb(arr);
    };
  };

  this.$('.typeahead').typeahead({
    hint: true,
    highlight: true,
    minLength: 1
  },
  {
    name: 'users',
    displayKey: function(user) {
      return user.profile.name;
    },
    source: substringMatcher(Meteor.users, 'profile.name')
  });

  maybeEnableUserSelectForm(this);
};

Template.editCompetition_users.helpers({
  users: function() {
    // TODO - sort by name?
    if(!this.userIds) {
      return [];
    }
    return Meteor.users.find({_id: { $in: this.userIds } });
  }
});
