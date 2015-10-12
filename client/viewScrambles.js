var selectedGroupReact = new ReactiveVar(null);

Template.viewScrambles.helpers({
  allRounds: function() {
    return Rounds.find({competitionId: this.competitionId}, { sort: { eventCode: 1, nthRound: 1 }});
  },
  selectedGroup: function() {
    return selectedGroupReact.get();
  },
});

Template.viewScrambles.events({
  'click #scramble-display button': function() {
    selectedGroupReact.set(this);
  },
});
