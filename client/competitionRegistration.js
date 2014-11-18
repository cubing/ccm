Template.competitionRegistration.helpers({
  events: function() {
    var that = this;
    var events = _.map(_.toArray(wca.eventByCode), function(e, i) {
      return {
        index: i,
        competitionId: that.competitionId,
        eventCode: e.code,
        eventName: e.name
      };
    });
    return events;
  },
});

Template.competitionRegistration.events({
  'click #registerButton': function(e) {
    // TODO - >>> actually do something here =) <<<
    e.preventDefault();
  },
});
