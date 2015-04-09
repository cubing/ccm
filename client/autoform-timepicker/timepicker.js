AutoForm.addInputType("timeOfDayMinutes", {
  template: "afInputTimeOfDayMinutes",
  valueIn: function(val) {
    return minutesToPrettyTime(val);
  },
  valueOut: function() {
    var secondsFromMidnight = this.timepicker('getSecondsFromMidnight');
    var minutesFromMidnight = secondsFromMidnight / 60;
    return minutesFromMidnight;
  },
});

Template.afInputTimeOfDayMinutes.rendered = function() {
  var template = this;
  template.autorun(function() {
    var data = Template.currentData();
    var minTime = minutesToPrettyTime(data.min);
    var maxTime = minutesToPrettyTime(data.max);
    template.$('input').timepicker({
      minTime: minTime,
      maxTime: maxTime,
    });
  });
};

Template.afInputTimeOfDayMinutes.events({
  'change input': function(e) {
    var $target = $(e.currentTarget);
    var secondsFromMidnight = $target.timepicker('getSecondsFromMidnight');
  },
});
