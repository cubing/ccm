AutoForm.addInputType("timeOfDayMinutes", {
  template: "afInputTimeOfDayMinutes",
  valueIn: function(val) {
    return minutesToPrettyTime(val);
  },
  valueOut: function() {
    let secondsFromMidnight = this.timepicker('getSecondsFromMidnight');
    let minutesFromMidnight = secondsFromMidnight / 60;
    return minutesFromMidnight;
  },
});

Template.afInputTimeOfDayMinutes.rendered = function() {
  let template = this;
  template.autorun(function() {
    let data = Template.currentData();
    let minTime = minutesToPrettyTime(data.min);
    let maxTime = minutesToPrettyTime(data.max);
    template.$('input').timepicker({
      minTime: minTime,
      maxTime: maxTime,
    });
  });
};

Template.afInputTimeOfDayMinutes.events({
  'change input': function(e) {
    let $target = $(e.currentTarget);
    let secondsFromMidnight = $target.timepicker('getSecondsFromMidnight');
  },
});
