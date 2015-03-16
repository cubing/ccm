var editingRoundReact = new ReactiveVar(null);

Template.editSchedule.helpers({
  unscheduledRounds: function() {
    var rounds = getUnscheduledRounds(this.competitionId);

    return rounds;
  },
  editingRound: function() {
    return editingRoundReact.get();
  },
});

Template.editSchedule.events({
  'input .date': function(e) {
    var attribute = e.currentTarget.dataset.attribute;
    var $target = $(e.currentTarget);
    var $input = $target.find('input');
    var value = $input.val();
    if(value.length === 0) {
      // bootstrap-datepicker doesn't fire changeDate when someone deletes all
      // the text from the input (https://github.com/cubing/ccm/issues/46).
      // This is a workaround for that.
      setCompetitionAttribute(this.competitionId, attribute, null);
    }
  },
  'changeDate .date': function(e) {
    var attribute = e.currentTarget.dataset.attribute;
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
    editingRoundReact.set(newRound);
    t.$('#addEditSomethingModal').modal('show');
  },
  'hidden.bs.modal #addEditSomethingModal': function(e, t) {
    editingRoundReact.set(null);
  },
});

function getScheduledRounds(competitionId) {
  var rounds = Rounds.find({
    competitionId: competitionId,
    startMinutes: {$exists: true}
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
  return rounds;
}
function getUnscheduledRounds(competitionId) {
  var rounds = Rounds.find({
    competitionId: competitionId,
    startMinutes: {$exists: false}
  }, {
    fields: {
      eventCode: 1,
      roundCode: 1,

      durationMinutes: 1,
      nthDay: 1,
      title: 1,
    }
  }).fetch();
  return rounds;
}

// This is global so competitionSchedule.js can use it
setupCompetitionCalendar = function(template, $calendarDiv, $editModal) {
  var calendarRounds = [];

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

      var $set = {
        nthDay: nthDay,
        startMinutes: startMinutes,
      };

      if(calEvent.end) {
        $set.durationMinutes = calEvent.end.diff(calEvent.start, 'minutes');
      }

      Rounds.update({ _id: calEvent.id }, { $set: $set });
    };

    $calendarDiv.fullCalendar({
      header: {
        left: '',
        center: 'title',
        right: '',
      },
      durationDays: numberOfDays,
      allDaySlot: false,
      slotDuration: { minutes: 30 },
      snapDuration: { minutes: Round.MIN_ROUND_DURATION.asMinutes() },
      minTime: minTime,
      maxTime: maxTime,
      defaultDate: startDateMoment.toISOString(),
      defaultTimedEventDuration: { minutes: Round.DEFAULT_ROUND_DURATION.asMinutes() },
      defaultView: 'agendaDays',
      editable: !!$editModal,
      contentHeight: 'auto',
      droppable: true,
      drop: function(date) {
        var roundId = $(this).data('round-id');

        if(roundId) {
          var calEvent = {
            id: roundId,
            start: date,
          };
          eventChanged(calEvent);
          $(this).remove();
        } else {
          var startHour = date.utc().get('hour');
          var startMinute = date.utc().get('minute');

          var round = {
            startMinutes: startHour*60 + startMinute,
            durationMinutes: DEFAULT_ROUND_DURATION.asMinutes(),
          };

          editingRoundReact.set(round);
          $editModal.modal('show');
        }
      },
      events: function(start, end, timezone, callback) {
        var calEvents = [];

        _.each(calendarRounds, function(round) {
          // startDateMoment is guaranteed to be in UTC, so there's no
          // weirdness here with adding time to a midnight that is about to
          // experience DST.
          var day = startDateMoment.clone().add(round.nthDay, 'days');
          var start = day.clone().add(round.startMinutes, 'minutes');
          var end = start.clone().add(round.durationMinutes, 'minutes');
          var title = roundTitle(round);
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

        callback(calEvents);
      },
      eventClick: function(calEvent, jsEvent, view) {
        var round = Rounds.findOne({ _id: calEvent.id });
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
    calendarRounds = getScheduledRounds(data.competitionId);
    $calendarDiv.fullCalendar('refetchEvents');
  });
};

Template.editSchedule.rendered = function() {
  var template = this;

  // Restrict number of days to be at least enough to show all the scheduled
  // events.
  template.autorun(function() {
    var data = Template.currentData();
    var rounds = getScheduledRounds(data.competitionId);
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
    var rounds = getScheduledRounds(data.competitionId);
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
    template.$('.date').each(function() {
      var date = getCompetitionAttribute(data.competitionId, this.dataset.attribute);

      var $datePicker = template.$(this);
      $datePicker.datepicker('update', date);
    });
  });

  var $calendar = template.$('#calendar');
  var $addEditSomethingModal = template.$('#addEditSomethingModal');
  setupCompetitionCalendar(template, $calendar, $addEditSomethingModal);

  this.$('.fc-event').draggable({
    zIndex: 999,
    revert: true,
    revertDuration: 0,
  });
};

Template.unscheduledRound.rendered = function() {
  var template = this;
  var $unscheduledRound = template.$('.fc-event');

  // make the event draggable using jQuery UI
  $unscheduledRound.draggable({
    zIndex: 999,
    revert: true,
    revertDuration: 0,
  });
};

Template.unscheduledRound.helpers({
    title: function() {
      return roundTitle(this);
    },
});

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
    var endPretty = null;
    if(typeof editingRound.startMinutes !== 'undefined' && editingRound.startMinutes !== null) {
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
  var earliestPossibleEndMinutes = Round.MIN_ROUND_DURATION.asMinutes() + (proposedRound.startMinutes || 0);
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
