Template.manageCheckin.rendered = function() {
  var template = this;
  var $checkinTable = this.$('#checkinTable');
  $checkinTable.stickyTableHeaders();
};

Template.manageCheckin.destroyed = function() {
  var $checkinTable = this.$('#checkinTable');
  $checkinTable.stickyTableHeaders('destroy');
};

Template.manageCheckin.helpers({
  registrations: function() {
    var registrations = Registrations.find({
      competitionId: this.competitionId,
    }, {
      sort: {
        uniqueName: 1,
      },
      fields: {
        competitionId: 1,
        uniqueName: 1,
        gender: 1,
        dob: 1,
        events: 1,
      },
    });
    return registrations;
  },

  registeredForEvent: function() {
    var registration = Template.parentData(1);
    return _.contains(registration.events, this.eventCode);
  },

  uncheckedIn: function() {
    return true;//<<<
  },
  checkinNeedsUpdate: function() {
    return true;//<<<
  },
});
