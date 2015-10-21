Template.viewScrambles.created = function() {
  let template = this;
  template.selectedGroupReact = new ReactiveVar(null);
};

Template.viewScrambles.helpers({
  allRounds: function() {
    return Rounds.find({competitionId: this.competitionId}, { sort: { eventCode: 1, nthRound: 1 }});
  },
  selectedGroup: function() {
    let template = Template.instance();
    return template.selectedGroupReact.get();
  },
});

Template.viewScrambles.events({
  'click #scramble-display button': function(e, template) {
    template.selectedGroupReact.set(this);
  },
});
