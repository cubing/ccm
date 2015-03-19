var editingRoundReact = new ReactiveVar(null);

Template.editSchedule.helpers({
  competition: function() {
    return Competitions.findOne(this.competitionId);
  },
  unscheduledRounds: function() {
    var rounds = getRounds(this.competitionId, { scheduled: false });
    return rounds;
  },
  editingRound: function() {
    return editingRoundReact.get();
  },
});

Template.editSchedule.events({
  'hidden.bs.modal #addEditSomethingModal': function(e, t) {
    editingRoundReact.set(null);
  },
});

function getRounds(competitionId, opts) {
  var includeScheduled = !!opts.scheduled;
  var rounds = Rounds.find({ competitionId: competitionId }).fetch();
  rounds = _.filter(rounds, function(round) {
    var roundScheduled = round.isScheduled();
    return roundScheduled == includeScheduled;
  });
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
      return Math.floor(duration.asHours()) + ":" + duration.minutes() + ":00";
    }
    var calendarStartMinutes = getCompetitionCalendarStartMinutes(competitionId);
    var calendarEndMinutes = getCompetitionCalendarEndMinutes(competitionId);
    var numberOfDays = getCompetitionNumberOfDays(competitionId);

    var startDateMoment = getCompetitionStartDateMoment(competitionId);
    if(!startDateMoment) {
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
      snapDuration: { minutes: Round.MIN_DURATION.asMinutes() },
      minTime: minTime,
      maxTime: maxTime,
      defaultDate: startDateMoment.toISOString(),
      defaultTimedEventDuration: { minutes: Round.DEFAULT_DURATION.asMinutes() },
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
            competitionId: competitionId,
            startMinutes: startHour*60 + startMinute,
            durationMinutes: Round.DEFAULT_DURATION.asMinutes(),
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
          var title = round.prettyTitle();
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
    calendarRounds = getRounds(data.competitionId, { scheduled: true });
    $calendarDiv.fullCalendar('refetchEvents');
  });
};

function makeDraggable($el) {
  $el.draggable({
    zIndex: 999,
    revert: true,
    revertDuration: 0,
  });
}

Template.editSchedule.rendered = function() {
  var template = this;

  var $calendar = template.$('#calendar');
  var $addEditSomethingModal = template.$('#addEditSomethingModal');
  setupCompetitionCalendar(template, $calendar, $addEditSomethingModal);
  makeDraggable(template.$('#new-calender-entry'));
};

Template.unscheduledRound.rendered = function() {
  var template = this;
  var $unscheduledRound = template.$('.fc-event');
  makeDraggable($unscheduledRound);
};

Template.addEditSomethingModal.helpers({
  editingRound: function() {
    return editingRoundReact.get();
  },
  formType: function() {
    return this._id ? "update" : "add";
  },
});

AutoForm.hooks({
  editRoundForm: {
    onSubmit: function(insertDoc, updateDoc, currentDoc) {
      this.event.preventDefault();

      if(currentDoc._id) {
        // Updating an existing round
        Rounds.update({
          _id: currentDoc._id,
        }, {
          $set: {
            title: insertDoc.title,
            startMinutes: insertDoc.startMinutes,
            durationMinutes: insertDoc.durationMinutes,
          }
        });
        $('#addEditSomethingModal').modal('hide');
      } else {
        // Adding a new round
        Meteor.call('addNonEventRound', currentDoc.competitionId, insertDoc, function(error, result) {
          if(error) {
            throw error;
          }
          $('#addEditSomethingModal').modal('hide');
        });
      }
    }
  },
});

Template.addEditSomethingModal.events({
  'click #buttonDeleteRound': function(e, template) {
    var editingRound = editingRoundReact.get();
    assert(!editingRound.eventCode);
    assert(editingRound._id);
    Meteor.call('removeRound', editingRound._id, function(error, result) {
      if(error) {
        throw error;
      }
      template.$('#deleteRoundConfirmModal').modal('hide');
      template.$('#addEditSomethingModal').modal('hide');
    });
  },
});
