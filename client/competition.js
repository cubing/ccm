Template.competition.helpers({
  registeredForCompetition: function() {
    var registration = Registrations.findOne({
      competitionId: this.competitionId,
      userId: Meteor.userId(),
    }, {
      fields: { _id: 1 }
    });
    return !!registration;
  },
  competitionIsScheduled: function() {
    return Competitions.findOne(this.competitionId).startDate;
  },
  dateInterval: function() {
    var comp = Competitions.findOne(this.competitionId);
    return $.fullCalendar.formatRange(moment(comp.startDate).utc(), moment(comp.endDate()).utc(), "LL");
  },
});
