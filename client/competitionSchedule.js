Template.competitionSchedule.rendered = function() {
  let template = this;
  let $calendar = template.$('#calendar');
  let editable = false;
  setupCompetitionCalendar(template, $calendar, editable);
};
