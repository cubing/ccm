var eventToEditReact = new ReactiveVar(null);

Template.editSchedule.helpers({
  competition: function() {
    return Competitions.findOne(this.competitionId);
  },
  sortedRounds: function() {
    var allRounds = Rounds.find({ competitionId: this.competitionId }).fetch();
    return _.sortBy(allRounds, function(round) { return round.displayTitle(); });
  },
  eventToEdit: function() {
    return eventToEditReact.get();
  },
});

Template.editSchedule.events({
  'hidden.bs.modal #editEventModal': function(e, t) {
    eventToEditReact.set(null);
  },
});

// This is global so competitionSchedule.js can use it
setupCompetitionCalendar = function(template, $calendarDiv, $editModal) {
  var dbScheduleEvents = [];

  template.autorun(function() {
    var data = Template.currentData();
    var competitionId = data.competitionId;

    $calendarDiv.fullCalendar('destroy');

    function timeMinutesToFullCalendarTime(timeMinutes) {
      var duration = moment.duration(timeMinutes, 'minutes');
      return Math.floor(duration.asHours()) + ":" + duration.minutes() + ":00";
    }
    var compStartMinutes = getCompetitionCalendarStartMinutes(competitionId);
    var compEndMinutes = getCompetitionCalendarEndMinutes(competitionId);
    var numberOfDays = getCompetitionNumberOfDays(competitionId);

    var startDateMoment = getCompetitionStartDateMoment(competitionId) || moment.utc().startOf('day');

    var eventChanged = function(event) {
      var update = {
        nthDay: event.start.diff(startDateMoment, 'days'),
        startMinutes: event.start.hour()*60 + event.start.minute(),
        durationMinutes: event.end.diff(event.start, 'minutes'),
      };

      ScheduleEvents.update(event.id, { $set: update });
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
      snapDuration: { minutes: ScheduleEvent.MIN_DURATION.asMinutes() },
      minTime: timeMinutesToFullCalendarTime(compStartMinutes),
      maxTime: timeMinutesToFullCalendarTime(compEndMinutes),
      defaultDate: startDateMoment.toISOString(),
      defaultTimedEventDuration: { minutes: ScheduleEvent.DEFAULT_DURATION.asMinutes() },
      defaultView: 'agendaDays',
      editable: !!$editModal,
      contentHeight: 'auto',
      droppable: true,
      drop: function(date) { // A round / new event was dragged onto the schedule
        var newEventData = {
          competitionId: competitionId,
          startMinutes: date.utc().get('hour')*60 + date.utc().get('minute'),
          durationMinutes: ScheduleEvent.DEFAULT_DURATION.asMinutes(),
        };

        var droppedRoundId = $(this).data('round-id');
        if(droppedRoundId) {
          Meteor.call('addScheduleEvent', competitionId, newEventData, droppedRoundId);
          $(this).remove();
        } else {
          eventToEditReact.set(newEventData);
          $editModal.modal('show');
        }
      },
      events: function(start, end, timezone, callback) {
        var calEvents = [];

        _.each(dbScheduleEvents, function(dbEvent) {
          // startDateMoment is guaranteed to be in UTC, so there's no
          // weirdness here with adding time to a midnight that is about to
          // experience DST.
          var day = startDateMoment.clone().add(dbEvent.nthDay, 'days');
          var start = day.clone().add(dbEvent.startMinutes, 'minutes');
          var end = start.clone().add(dbEvent.durationMinutes, 'minutes');
          var calEvent = {
            id: dbEvent._id,
            title: dbEvent.displayTitle(),
            start: start,
            end: end,
            color: dbEvent.roundId ? "" : "#aa0000",
          };
          calEvents.push(calEvent);
        });

        callback(calEvents);
      },
      eventClick: function(calEvent, jsEvent, view) {
        eventToEditReact.set(ScheduleEvents.findOne(calEvent.id));
        $editModal.modal('show');
      },
      eventDrop: function(calEvent, delta, revertFunc, jsEvent, ui, view) { // Existing entry dragged
        eventChanged(calEvent);
      },
      eventResize: function(calEvent, delta, revertFunc, jsEvent, ui, view) {
        eventChanged(calEvent);
      },
    });
  });

  template.autorun(function() {
    var data = Template.currentData();
    dbScheduleEvents = ScheduleEvents.find({ competitionId: data.competitionId }).fetch();
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
  var $editEventModal = template.$('#editEventModal');
  setupCompetitionCalendar(template, $calendar, $editEventModal);
  makeDraggable(template.$('#new-calender-entry'));
};

Template.sortedRound.helpers({
  draggability: function(alreadyScheduled) {
    return alreadyScheduled ? "undraggable" : "draggable";
  },
});

Template.sortedRound.rendered = function() {
  var template = this;
  makeDraggable(template.$('.draggable'));
};

Template.editEventModal.helpers({
  eventToEdit: function() {
    return eventToEditReact.get();
  },
  formType: function() {
    return this._id ? "update" : "add";
  },
});

AutoForm.hooks({
  editEventForm: {
    onSubmit: function(insertDoc, updateDoc, currentDoc) {
      this.event.preventDefault();

      if(currentDoc._id) {
        delete updateDoc.$set.competitionId; // Don't touch the competitionId field. We don't trust browser input that much.
        ScheduleEvents.update({ _id: currentDoc._id, }, updateDoc);
      } else {
        Meteor.call('addScheduleEvent', currentDoc.competitionId, insertDoc, null);
      }
      $('#editEventModal').modal('hide');
    }
  },
});

Template.editEventModal.events({
  'click #buttonDeleteEvent': function(e, template) {
    var eventToEdit = eventToEditReact.get();
    assert(eventToEdit._id);
    Meteor.call('removeScheduleEvent', eventToEdit._id, function(err, result) {
      if(!err) {
        template.$('#deleteEventConfirmModal').modal('hide');
        template.$('#editEventModal').modal('hide');
      } else {
        console.error("Meteor.call() error: " + err);
      }
    });
  },
});
