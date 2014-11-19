Template.competition.helpers({
  registeredForCompetition: function() {
    var competitors = getCompetitionAttribute(this.competitionId, 'competitors');
    var registered = _.contains(_.pluck(competitors, '_id'), Meteor.userId());
    return registered;
  },
});
