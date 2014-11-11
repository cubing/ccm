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

function getRoundsWithSchedule(competitionId) {
  var rounds = Rounds.find({
    competitionId: competitionId,
  }, {
    fields: {
      eventCode: 1,
      roundCode: 1,

      startMinutes: 1,
      durationMinutes: 1,
      nthDay: 1,
    }
  }).fetch();
  _.each(rounds, function(round) {
    // 10:30am default
    round.startMinutes = round.startMinutes || 10.5*60;
    // 1 hour duration default
    round.durationMinutes = round.durationMinutes || 60;
    // 0th day default
    round.nthDay = round.nthDay || 0;
  });
  return rounds;
}

Template.editSchedule.rendered = function(){
  var template = this;

  // Restrict number of days to be at least enough to show all the scheduled
  // events.
  template.autorun(function() {
    var rounds = getRoundsWithSchedule(template.data.competitionId);
    var maxNthDay = _.max(_.pluck(rounds, 'nthDay'));

    var numberOfDays = template.$("input[name='numberOfDays']");
    numberOfDays.attr('min', maxNthDay + 1);
  });

  // Enable the start and stop time pickers
  template.$('#startEndTime input').timepicker({
    selectOnBlur: true,
  });
  template.autorun(function() {
    var rounds = getRoundsWithSchedule(template.data.competitionId);
    var earliestStartMinutes = _.min(_.pluck(rounds, "startMinutes"));
    var latestEndMinutes = _.max(_.map(rounds, function(round) {
      return round.startMinutes + round.durationMinutes;
    }));

    var calendarEndMinutes = getCompetitionAttribute(template.data.competitionId, 'calendarEndMinutes');
    var latestPossibleStartTimePretty = minutesToPrettyTime(
        Math.min(calendarEndMinutes, earliestStartMinutes));

    var $startTime = template.$('#startEndTime input.start');
    $startTime.timepicker('option', {
      minTime: '12am',
      maxTime: latestPossibleStartTimePretty,
    });

    var calendarStartMinutes = getCompetitionAttribute(template.data.competitionId, 'calendarStartMinutes');
    var earliestPossibleEndTimePretty = minutesToPrettyTime(
        Math.max(calendarStartMinutes, latestEndMinutes));
    var $endTime = template.$('#startEndTime input.end');
    $endTime.timepicker('option', {
      minTime: earliestPossibleEndTimePretty,
      maxTime: '11:30pm',
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
    var calendarStartMinutes = getCompetitionCalendarStartMinutes(competitionId);
    var calendarEndMinutes = getCompetitionCalendarEndMinutes(competitionId);
    var numberOfDays = getCompetitionNumberOfDays(competitionId);

    var startDate = getCompetitionAttribute(competitionId, 'startDate');

    var startDateMoment = null;
    if(startDate) {
      // strip all time zone info from date and use utc time
      startDateMoment = moment.utc(moment(startDate).format("YYYY-MM-DD"));
    } else {
      startDateMoment = moment.utc().startOf('day');
    }
    var minTime = timeMinutesToFullCalendarTime(calendarStartMinutes);
    var maxTime = timeMinutesToFullCalendarTime(calendarEndMinutes);

    // TODO - >>> do this in a separate autorun to avoid rerendering the
    // *whole* calendar every time an event changes <<<
    var rounds = getRoundsWithSchedule(template.data.competitionId);
    var calEvents = _.map(rounds, function(round) {
      // startDateMoment is guaranteed to be in UTC, so there's no
      // weirdness here with adding time to a midnight that is about to
      // experience DST.
      var day = startDateMoment.clone().add(round.nthDay, 'days');
      var start = day.clone().add(round.startMinutes, 'minutes');
      var end = start.clone().add(round.durationMinutes, 'minutes');
      var title = wca.eventByCode[round.eventCode].name + ": " + wca.roundByCode[round.roundCode].name;
      var calEvent = {
        id: round._id,
        title: title,
        start: start,
        end: end,
      };
      return calEvent;
    });

    var eventChanged = function(calEvent) {
      var nthDay = calEvent.start.diff(startDateMoment, 'days');
      var startMinutes = calEvent.start.hour()*60 + calEvent.start.minute();
      var durationMinutes = calEvent.end.diff(calEvent.start, 'minutes');
      Rounds.update({
        _id: calEvent.id
      }, {
        $set: {
          nthDay: nthDay,
          startMinutes: startMinutes,
          durationMinutes: durationMinutes,
        }
      });
    };

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
      events: calEvents,
      eventClick: function(calEvent, jsEvent, view){
      },
      eventDrop: function(calEvent, delta, revertFunc, jsEvent, ui, view) {
        eventChanged(calEvent);
      },
      eventResize: function(calEvent, delta, revertFunc, jsEvent, ui, view) {
        eventChanged(calEvent);
      },
    });
  });
};
