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
  draggability: function() {
    return this.isScheduled() ? "undraggable" : "draggable";
  },
});

Template.editSchedule.events({
  'hidden.bs.modal #editEventModal': function(e, t) {
    eventToEditReact.set(null);
  },
});

Template.editSchedule.rendered = function() {
  var template = this;
  var $calendar = template.$('#calendar');
  var $editEventModal = template.$('#editEventModal');
  setupCompetitionCalendar(template, $calendar, $editEventModal);

  template.$('.draggable').draggable({
    zIndex: 999,
    revert: true,
    revertDuration: 0,
  });
};

// This is global so competitionSchedule.js can use it
setupCompetitionCalendar = function(template, $calendarDiv, $editModal) {
  var dbScheduleEvents = [];

  template.autorun(function() {
    var data = Template.currentData();
    var competitionId = data.competitionId;
    var competition = Competitions.findOne(competitionId);

    $calendarDiv.fullCalendar('destroy');

    function timeMinutesToFullCalendarTime(timeMinutes) {
      var duration = moment.duration(timeMinutes, 'minutes');
      return Math.floor(duration.asHours()) + ":" + duration.minutes() + ":00";
    }

    var startDateMoment = getCompetitionStartDateMoment(competitionId) || moment.utc().startOf('day');

    var eventChanged = function(event, revertFunc) {
      var update = {
        nthDay: event.start.diff(startDateMoment, 'days'),
        startMinutes: event.start.hour()*60 + event.start.minute(),
        durationMinutes: event.end.diff(event.start, 'minutes'),
      };

      var successCount = ScheduleEvents.update(event.id, { $set: update });
      if(!successCount) {
        revertFunc(); // moves the event back to before the drag
      }
    };

    $calendarDiv.fullCalendar({
      header: {
        left: '',
        center: 'title',
        right: '',
      },
      durationDays: competition.numberOfDays,
      allDaySlot: false,
      slotDuration: { minutes: 30 },
      snapDuration: { minutes: ScheduleEvent.MIN_DURATION.asMinutes() },
      minTime: timeMinutesToFullCalendarTime(competition.calendarStartMinutes),
      maxTime: timeMinutesToFullCalendarTime(competition.calendarEndMinutes),
      defaultDate: startDateMoment.toISOString(),
      defaultTimedEventDuration: { minutes: ScheduleEvent.DEFAULT_DURATION.asMinutes() },
      defaultView: 'agendaDays',
      editable: !!$editModal,
      contentHeight: 'auto',
      droppable: true,
      drop: function(date) { // A round / new event was dragged onto the schedule
        var newEventData = {
          competitionId: competitionId,
          nthDay: date.diff(startDateMoment, 'days'),
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
        eventChanged(calEvent, revertFunc);
      },
      eventResize: function(calEvent, delta, revertFunc, jsEvent, ui, view) {
        eventChanged(calEvent, revertFunc);
      },
    });
  });

  template.autorun(function() {
    var data = Template.currentData();
    dbScheduleEvents = ScheduleEvents.find({ competitionId: data.competitionId }).fetch();
    $calendarDiv.fullCalendar('refetchEvents');
  });
};

Template.editEventModal.helpers({
  eventToEdit: function() {
    return eventToEditReact.get();
  },
  formType: function() {
    return this._id ? "update" : "add";
  },
  multipleDayCompetition: function() {
    return Competitions.findOne(this.competitionId).numberOfDays > 1;
  },
  nthDayOptions: function() {
    var options = [];
    for(var i = 0; i < Competitions.findOne(this.competitionId).numberOfDays; i += 1) {
      options.push({label: "Day " + (i+1), value: i});
    }
    return options;
  },
});

AutoForm.hooks({
  editEventForm: {
    onSubmit: function(insertDoc, updateDoc, currentDoc) {
      this.event.preventDefault();

      if(currentDoc._id) {
        delete updateDoc.$set.competitionId; // Don't update the competitionId field. We can't trust browser input.
        ScheduleEvents.update(currentDoc._id, updateDoc);
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
