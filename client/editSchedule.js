Template.editSchedule.helpers({
  unscheduledRounds: function(){
    var rounds = Rounds.find({
      competitionId: this.competitionId
    });
    return rounds;
  }
});

Template.editSchedule.events({
  'changeDate #startDatePicker': function(e) {
    var attribute = 'startDate';
    var value = e.date;
    setCompetitionAttribute(this.competitionId, attribute, value);
  },
  'input input[type="number"]': function(e) {
    var attribute = e.currentTarget.name;
    var value = parseInt(e.currentTarget.value);
    if(!isNaN(value)) {
      setCompetitionAttribute(this.competitionId, attribute, value);
    }
  },
  'changeTime .time': function(e) {
    var attribute = e.currentTarget.name;
    var value = e.currentTarget.value;
    var time = moment(value, 'HH:mm a');
    var minutes = time.hour()*60 + time.minute();
    setCompetitionAttribute(this.competitionId, attribute, minutes);
  },
});

Template.editSchedule.rendered = function(){
  var template = this;

  // Enable the start and stop time pickers
  template.$('#startEndTime input').timepicker({
    selectOnBlur: true,
    maxTime: '11:30pm',
  });
  template.autorun(function() {
    var startTime = getCompetitionAttribute(template.data.competitionId, 'startTime');
    var startTimePretty = prettyTimeFromMinutes(startTime);
    var $endTime = template.$('#startEndTime input.end');
    $endTime.timepicker('option', {
      minTime: startTimePretty,
    });
  });

  template.autorun(function(){
    var startDate = getCompetitionAttribute(template.data.competitionId, 'startDate');

    var $startDatePicker = template.$('#startDatePicker');
    $startDatePicker.datepicker('update', startDate);
  });

  template.autorun(function(){
    var competitionId = template.data.competitionId;

    $('#calendar').fullCalendar('destroy');

    function timeMinutesToFullCalendarTime(timeMinutes) {
      var duration = moment.duration(timeMinutes, 'minutes');
      return duration.hours() + ":" + duration.minutes() + ":00";
    }
    var startTime = getCompetitionStartTime(competitionId);
    var endTime = getCompetitionEndTime(competitionId);
    var numberOfDays = getCompetitionNumberOfDays(competitionId);

    var startDate = getCompetitionAttribute(competitionId, 'startDate');

    var startDateMoment = startDate ? moment(startDate) : moment();
    startDateMoment = startDateMoment.startOf('day');
    var minTime = timeMinutesToFullCalendarTime(startTime);
    var maxTime = timeMinutesToFullCalendarTime(endTime);

    $('#calendar').fullCalendar({
      header: {
        left: '',
        center: 'title',
        right: '',
      },
      durationDays: numberOfDays,
      allDaySlot: false,
      slotDuration: '00:30:00',
      snapDuration: '00:15:00',
      minTime: minTime,
      maxTime: maxTime,
      defaultDate: startDateMoment.toISOString(),
      defaultView: 'agendaDays',
      editable: true,
      contentHeight: 'auto',
      events: [//<<<
        {
          id: 4242,
          title: 'Meeting',
          start: startDateMoment.clone().add(10.5, 'hours'),
          end: startDateMoment.clone().add(12.5, 'hours')
        },
      ],
      eventClick: function(calEvent, jsEvent, view){
        console.log(calEvent);//<<<
        if(confirm()) {
          $('#calendar').fullCalendar('removeEvents', calEvent.id);//<<<
        }
      },
      eventDragStop: function(calEvent, jsEvent, ui, view) {
        console.log(calEvent);//<<<
      },
    });
  });
};
