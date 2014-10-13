if(Meteor.isClient) {

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

  Template.editCompetition.eventList = function() {
    var competitionId = this._id;
    return _.map(_.toArray(wca.eventByCode), function(e) {
      return {
        competitionId: competitionId,
        eventCode: e.code,
        eventName: e.name
      };
    });
  };

  Template.editCompetition.rounds = function() {
    var rounds = Rounds.find(
      { competitionId: this.competitionId, eventCode: this.eventCode }
    );
    return rounds;
  };

  Template.editCompetition_users.usersAutocompleteSettings = function() {
    // TODO - Client side workaround for
    // https://github.com/mizzao/meteor-autocomplete/issues/43#issuecomment-58858328
    var fakeCollection = {
      find: function(selector, options) {
        var allResults = Meteor.users.find(selector, options).fetch();
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
          collection: fakeCollection,
          field: "profile.name",
          template: Template.userPill,
          matchAll: true
        }
      ]
    };
  };

  Template.editCompetition_users.users = function() {
    // TODO - sort by name?
    if(!this.userIds) {
      return [];
    }
    return Meteor.users.find({_id: { $in: this.userIds } });
  };

}

Competitions.allow({
  update: function(userId, doc, fields, modifier) {
    if(doc.organizers.indexOf(userId) == -1) {
      return false;
    }
    var allowedFields = [ 'competitionName', 'wcaCompetitionId' ];

    // TODO - see https://github.com/jfly/gjcomps/issues/10
    allowedFields.push("listed");

    if(_.difference(fields, allowedFields).length > 0) {
      return false;
    }
    return true;
  },
  fetch: [ 'organizers' ]
});

