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
    }
  });

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

