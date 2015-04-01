var selectedGroupReact = new ReactiveVar(null);

Template.displayScrambles.helpers({
  allRounds: function() {
    return Rounds.find({competitionId: this.competitionId}, { sort: { eventCode: 1, nthRound: 1 }});
  },
  selectedGroup: function() {
    return selectedGroupReact.get();
  },
});

Template.displayScrambles.events({
  'click #scramble-display button': function() {
    selectedGroupReact.set(this);
  },
});
