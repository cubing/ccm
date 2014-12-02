Template.newCompetition.events({
  'submit form': function(e) {
    e.preventDefault();

    var form = e.currentTarget;
    var competitionName = form.inputCompetitionName.value;
    Meteor.call("createCompetition", competitionName, function(err, competitionId) {
      if(err) {
        throw err;
      }
      Router.go('manageCompetition', {
        competitionUrlId: competitionId
      });
    });
  }
});
