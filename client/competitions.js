Template.competitions.helpers({
  allComps: function() {
    return Competitions.find({}, {
      fields: {
        wcaCompetitionId: 1,
        competitionName: 1,
        listed: 1
      }
    });
  },

  listedClass: function() {
    return this.listed ? "listed" : "unlisted";
  },

  myCompetitions: function() {
    var myCompetitions = Competitions.find(
      { organizers: { $elemMatch: { $in: [ Meteor.userId() ] } } }
    );
    return myCompetitions;
  },

  registeredForCompetition: function() {
    var competitors = getCompetitionAttribute(this.competitionId, 'competitors');
    var registered = _.contains(_.pluck(competitors, '_id'), Meteor.userId());
    return registered;
  },
});

Template.competitions.events({
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
