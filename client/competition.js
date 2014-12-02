Template.competition.helpers({
  registeredForCompetition: function() {
    var registrations = Registrations.find({
      competitionId: this.competitionId,
      userId: Meteor.userId(),
    }, {
      _id: 1,
    }).fetch();

    var registered = _.contains(_.pluck(registrations, '_id'), Meteor.userId());
    return registered;
  },
});
