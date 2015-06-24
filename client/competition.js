Template.competition.helpers({
  registeredForCompetition: function() {
    var registrations = Registrations.find({
      competitionId: this.competitionId,
      userId: Meteor.userId(),
    }, {
      fields: { _id: 1 }
    }).fetch();

    var registered = _.contains(_.pluck(registrations, '_id'), Meteor.userId()); // TODO Does this even work?
    return registered;
  },
  competitionIsScheduled: function() {
    return Competitions.findOne(this.competitionId).startDate;
  },
  dateInterval: function() {
    var comp = Competitions.findOne(this.competitionId);
    return $.fullCalendar.formatRange(moment(comp.startDate).utc(), moment(comp.endDate()).utc(), "LL");
  },
});
