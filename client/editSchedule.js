var MIN_ROUND_DURATION_MINUTES = 30;
var DEFAULT_ROUND_DURATION_MINUTES = 60;
var DEFAULT_ROUND_NTHDAY = 0;

var editingRoundReact = new ReactiveVar(null);

Template.editSchedule.helpers({
  unscheduledRounds: function() {
    var rounds = Rounds.find({
      competitionId: this.competitionId
    });
    return rounds;
  },
  editingRound: function() {
    return editingRoundReact.get();
  },
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
  'changeTime #startEndTime input.time': function(e) {
    var attribute = e.currentTarget.name;
    var minutes = $(e.currentTarget).timepicker('getSecondsFromMidnight') / 60;
    setCompetitionAttribute(this.competitionId, attribute, minutes);
  },
  'click #addCalendarEvent button': function(e, t) {
    var newRound = {};
    extendRound(newRound, this.competitionId);
    editingRoundReact.set(newRound);
    t.$('#addEditSomethingModal').modal('show');
  },
  'hidden.bs.modal #addEditSomethingModal': function(e, t) {
    editingRoundReact.set(null);
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
      title: 1,
    }
  }).fetch();
  _.each(rounds, function(round) {
    extendRound(round, competitionId);
  });
  return rounds;
}
function extendRound(round, competitionId) {
  var calendarStartMinutes = getCompetitionCalendarStartMinutes(competitionId);
  round.startMinutes = round.startMinutes || calendarStartMinutes;
  round.durationMinutes = round.durationMinutes || DEFAULT_ROUND_DURATION_MINUTES;
  round.nthDay = round.nthDay || DEFAULT_ROUND_NTHDAY;
}

// This is global so competitionSchedule.js can use it
setupCompetitionCalendar = function(template, $calendarDiv, $editModal) {
  template.autorun(function() {
    var data = Template.currentData();
    var competitionId = data.competitionId;

    $calendarDiv.fullCalendar('destroy');

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

    $calendarDiv.fullCalendar({
      header: {
        left: '',
        center: 'title',
        right: '',
      },
      durationDays: numberOfDays,
      allDaySlot: false,
      slotDuration: '00:30:00',
      snapDuration: '00:' + MIN_ROUND_DURATION_MINUTES + ':00',
      minTime: minTime,
      maxTime: maxTime,
      defaultDate: startDateMoment.toISOString(),
      defaultView: 'agendaDays',
      editable: !!$editModal,
      contentHeight: 'auto',
      events: function(start, end, timezone, callback) {
        var calEvents = [];
        // We run the event fetching in a nonreactive block because we don't
        // want to re-run the entire autorun block we're currently inside of
        // every time an event changes, as that causes the entire
        // calendar to flap. Instead, we'll explicitly call
        //  $('#calendar').fullCalendar('refetchEvents')
        // which will cause a more granular update of the calendar.
        Tracker.nonreactive(function() {
          var rounds = getRoundsWithSchedule(competitionId);
          _.each(rounds, function(round) {
            // startDateMoment is guaranteed to be in UTC, so there's no
            // weirdness here with adding time to a midnight that is about to
            // experience DST.
            var day = startDateMoment.clone().add(round.nthDay, 'days');
            var start = day.clone().add(round.startMinutes, 'minutes');
            var end = start.clone().add(round.durationMinutes, 'minutes');
            var title;
            // Rounds don't necessarily have events, such as Lunch or Registration.
            if(round.eventCode) {
              title = wca.eventByCode[round.eventCode].name + ": " + wca.roundByCode[round.roundCode].name;
            } else {
              title = round.title;
            }
            var color = round.eventCode ? "" : "#aa0000";
            var calEvent = {
              id: round._id,
              title: title,
              start: start,
              end: end,
              color: color,
            };
            calEvents.push(calEvent);
          });
        });
        callback(calEvents);
      },
      eventClick: function(calEvent, jsEvent, view) {
        var round = Rounds.findOne({ _id: calEvent.id });
        extendRound(round, competitionId);
        editingRoundReact.set(round);
        $editModal.modal('show');
      },
      eventDrop: function(calEvent, delta, revertFunc, jsEvent, ui, view) {
        eventChanged(calEvent);
      },
      eventResize: function(calEvent, delta, revertFunc, jsEvent, ui, view) {
        eventChanged(calEvent);
      },
    });
  });
  template.autorun(function() {
    var data = Template.currentData();
    var rounds = getRoundsWithSchedule(data.competitionId);
    $calendarDiv.fullCalendar('refetchEvents');
  });
};

Template.editSchedule.rendered = function() {
  var template = this;

  // Restrict number of days to be at least enough to show all the scheduled
  // events.
  template.autorun(function() {
    var data = Template.currentData();
    var rounds = getRoundsWithSchedule(data.competitionId);
    var maxNthDay = _.max(_.pluck(rounds, 'nthDay'));

    var numberOfDays = template.$("input[name='numberOfDays']");
    numberOfDays.attr('min', maxNthDay + 1);
  });

  // Enable the start and stop time pickers
  template.$('#startEndTime input.time').timepicker({
    selectOnBlur: true,
  });
  template.autorun(function() {
    var data = Template.currentData();
    var rounds = getRoundsWithSchedule(data.competitionId);
    var earliestStartMinutes = _.min(_.pluck(rounds, "startMinutes"));
    var latestEndMinutes = _.max(_.map(rounds, function(round) {
      return round.startMinutes + round.durationMinutes;
    }));

    var calendarEndMinutes = getCompetitionCalendarEndMinutes(data.competitionId);
    var latestPossibleStartTimePretty = minutesToPrettyTime(
        Math.min(calendarEndMinutes, earliestStartMinutes));

    var $startTime = template.$('#startEndTime input.start');
    $startTime.timepicker('option', {
      minTime: '12am',
      maxTime: latestPossibleStartTimePretty,
    });

    var calendarStartMinutes = getCompetitionCalendarStartMinutes(data.competitionId);
    var earliestPossibleEndTimePretty = minutesToPrettyTime(
        Math.max(calendarStartMinutes, latestEndMinutes));
    var $endTime = template.$('#startEndTime input.end');
    $endTime.timepicker('option', {
      minTime: earliestPossibleEndTimePretty,
      maxTime: '11:30pm',
    });
  });

  template.autorun(function() {
    var data = Template.currentData();
    var startDate = getCompetitionAttribute(data.competitionId, 'startDate');

    var $startDatePicker = template.$('#startDatePicker');
    $startDatePicker.datepicker('update', startDate);
  });

  var $calendar = template.$('#calendar');
  var $addEditSomethingModal = template.$('#addEditSomethingModal');
  setupCompetitionCalendar(template, $calendar, $addEditSomethingModal);
};

Template.addEditSomethingModal.helpers({
  editingRound: function() {
    return editingRoundReact.get();
  },
  errors: function() {
    return Template.instance().errorsReact.get();
  },
  errorCount: function() {
    var errors = Template.instance().errorsReact.get();
    var countsByType = _.countBy(_.values(errors), function(error) {
      return error ? "error" : "success";
    });
    return countsByType.error || 0;
  },
});

Template.addEditSomethingModal.rendered = function() {
  var template = this;

  template.$('input.time').timepicker({
    selectOnBlur: true,
  });

  template.autorun(function() {
    var data = Template.currentData();
    var editingRound = editingRoundReact.get();
    if(!editingRound) {
      return;
    }

    var startPretty = null;
    var startMinutes = null;
    var endPretty = null;
    if(typeof editingRound.startMinutes !== 'undefined' && editingRound.startMinutes !== null) {
      startMinutes = editingRound.startMinutes;
      startPretty = minutesToPrettyTime(editingRound.startMinutes);
      if(typeof editingRound.durationMinutes !== 'undefined' && editingRound.durationMinutes !== null) {
        var endMinutes = editingRound.startMinutes + editingRound.durationMinutes;
        endPretty = minutesToPrettyTime(endMinutes);
      }
    }

    var $startTime = $('#modalInputStartTime');
    $startTime.val(startPretty || '');
    var $endTime = $('#modalInputEndTime');
    $endTime.val(endPretty || '');

    var $title = template.$('#inputRoundTitle');
    $title.val(editingRound.title);

    // Now that we've updated the DOM, we can refresh the errors
    refreshErrors(template.errorsReact, data.competitionId);
  });
};

function getProposedRound() {
  var editingRound = editingRoundReact.get();
  if(!editingRound) {
    return {};
  }

  var proposedRound = {};
  proposedRound._id = editingRound._id;
  proposedRound.eventCode = editingRound.eventCode;

  var title = $("#inputRoundTitle").val();
  proposedRound.title = title;

  var validStartMinutes = $("#modalInputStartTime").timepicker('getTime');
  if(validStartMinutes) {
    var startMinutes = $("#modalInputStartTime").timepicker('getSecondsFromMidnight') / 60;
    proposedRound.startMinutes = startMinutes;

    var validEndMinutes = $("#modalInputEndTime").timepicker('getTime');
    if(validEndMinutes) {
      var endMinutes = $("#modalInputEndTime").timepicker('getSecondsFromMidnight') / 60;
      proposedRound.durationMinutes = endMinutes - proposedRound.startMinutes;
    }
  }

  return proposedRound;
}

function refreshErrors(errorsReact, competitionId) {
  var proposedRound = getProposedRound();

  var startMinutesError = '';
  if(typeof proposedRound.startMinutes === "undefined" || proposedRound.startMinutes === null) {
    startMinutesError = "required";
  }
  var endMinutesError = '';
  if(!proposedRound.durationMinutes || proposedRound.durationMinutes <= 0) {
    endMinutesError = "must be greater than start time";
  }
  var titleError = '';
  if(!proposedRound.eventCode && !proposedRound.title) {
    titleError = "required";
  }
  var errors = {
    startMinutes: startMinutesError,
    endMinutes: endMinutesError,
    title: titleError,
  };

  var calendarStartMinutes = getCompetitionCalendarStartMinutes(competitionId);
  var calendarEndMinutes = getCompetitionCalendarEndMinutes(competitionId);
  var $startTime = $('#modalInputStartTime');
  $startTime.timepicker('option', {
    minTime: minutesToPrettyTime(calendarStartMinutes),
    maxTime: minutesToPrettyTime(calendarEndMinutes),
  });

  var $endTime = $('#modalInputEndTime');
  var earliestPossibleEndMinutes = MIN_ROUND_DURATION_MINUTES + (proposedRound.startMinutes || 0);
  $endTime.timepicker('option', {
    minTime: minutesToPrettyTime(Math.max(calendarStartMinutes, earliestPossibleEndMinutes)),
    maxTime: minutesToPrettyTime(calendarEndMinutes),
  });

  errorsReact.set(errors);
}

Template.addEditSomethingModal.events({
  'changeTime input.time': function(e, template) {
    refreshErrors(template.errorsReact, this.competitionId);
  },
  'input input.time': function(e, template) {
    refreshErrors(template.errorsReact, this.competitionId);
  },
  'input input[name="title"]': function(e, template) {
    refreshErrors(template.errorsReact, this.competitionId);
  },
  'click #saveOrEditButton': function(e, template) {
    var proposedRound = getProposedRound();
    if(proposedRound._id) {
      // Updating an existing round
      Rounds.update({
        _id: proposedRound._id,
      }, {
        $set: {
          title: proposedRound.title,
          startMinutes: proposedRound.startMinutes,
          durationMinutes: proposedRound.durationMinutes,
        }
      });
      template.$('#addEditSomethingModal').modal('hide');
    } else {
      // Adding a new round
      Meteor.call('addNonEventRound', this.competitionId, proposedRound, function(error, result) {
        if(error) {
          throw error;
        }
        template.$('#addEditSomethingModal').modal('hide');
      });
    }
  },
  'click #buttonDeleteRound': function(e, template) {
    var proposedRound = getProposedRound();
    assert(!proposedRound.eventCode);
    assert(proposedRound._id);
    Meteor.call('removeRound', proposedRound._id, function(error, result) {
      if(error) {
        throw error;
      }
      template.$('#deleteRoundConfirmModal').modal('hide');
      template.$('#addEditSomethingModal').modal('hide');
    });
  },
});

Template.addEditSomethingModal.created = function() {
  this.errorsReact = new ReactiveVar({});
};
