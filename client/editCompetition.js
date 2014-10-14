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

Template.editCompetition_users.events({
  'submit form': function(e) {
    console.log(e);//<<<
    e.preventDefault();
  }
});

Template.editCompetition_users.helpers({
  usersAutocompleteSettings: function() {
    // TODO - Client side workaround for
    // https://github.com/mizzao/meteor-autocomplete/issues/43#issuecomment-58858328
    var fakeCollection = {
      find: function(selector, options) {
        var allResultsCursor = Meteor.users.find(selector, options);
        if(!selector['profile.name']) {
          return allResultsCursor;
        }
        var allResults = allResultsCursor.fetch();
        selector['profile.name'].$regex = "\\b" + selector['profile.name'].$regex;
        var preferredResults = Meteor.users.find(selector, options).fetch();

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
        arr.count = function() { return arr.length; };
        return arr;
      }
    };
    return {
      position: "top",
      limit: 5,
      rules: [
        {
          token: '@',//<<<
          collection: fakeCollection,
          field: "profile.name",
          template: Template.userPill,
          matchAll: true,
          callback: function(doc, element) {//<<<
            console.log(doc);
            console.log(element);
          }
        }
      ]
    };
  },

  users: function() {
    // TODO - sort by name?
    if(!this.userIds) {
      return [];
    }
    return Meteor.users.find({_id: { $in: this.userIds } });
  }
});
