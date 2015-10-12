Template.manageScrambleGroups.helpers({
  groups: function() {
    return Groups.find({ roundId: this.roundId }, { sort: { group: 1 } });
  },
});
