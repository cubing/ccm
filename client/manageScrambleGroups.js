Template.manageScrambleGroups.helpers({
  groups: function() {
    return Groups.find({ roundId: this.roundId }, { sort: { group: 1 } });
  },
});

Template.manageScrambleGroups.events({
  'click .js-toggle-group-open': function(e) {
    Meteor.call('toggleGroupOpen', this._id);
  },
});
