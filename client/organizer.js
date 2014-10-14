Template.organizer.helpers({
  myCompetitions: function() {
    var myCompetitions =  Competitions.find(
      { organizers: { $elemMatch: { $in: [ Meteor.userId() ] } } }
    );
    return myCompetitions;
  }
});

Template.organizer.events({
  'submit #newCompetitionForm': function(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var competitionName = form.competitionName.value;
    form.competitionName.value = '';
    form.competitionName.blur();
    Meteor.call('createCompetition', competitionName);
  },
  'click .deleteCompetition': function(event) {
    var competitionId = this._id;
    Meteor.call('deleteCompetition', competitionId);
  }
});
