Template.competitionSchedule.rendered = function() {
  var template = this;
  var $calendar = template.$('#calendar');
  var editable = false;
  setupCompetitionCalendar(template, $calendar, editable);
};
