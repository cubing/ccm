let eventToEditReact = new ReactiveVar(null);

function activateDraggable() {
  $('.draggable').draggable({
    zIndex: 999,
    revert: true,
    revertDuration: 0,
  });
}

Template.editSchedule.helpers({
  competition: function() {
    return Competitions.findOne(this.competitionId);
  },
  sortedRounds: function() {
    let allRounds = Rounds.find({ competitionId: this.competitionId }).fetch();
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
  let template = this;
  setupCompetitionCalendar(template, template.$('#calendar'), template.$('#editEventModal'));
  activateDraggable();
};

// This is global so competitionSchedule.js can use it
setupCompetitionCalendar = function(template, $calendarDiv, $editModal) {
  let dbScheduleEvents = [];

  template.autorun(function() {
    let data = Template.currentData();
    let competitionId = data.competitionId;
    let competition = Competitions.findOne(competitionId);

    $calendarDiv.fullCalendar('destroy');

    function timeMinutesToFullCalendarTime(timeMinutes) {
      let duration = moment.duration(timeMinutes, 'minutes');
      return Math.floor(duration.asHours()) + ":" + duration.minutes() + ":00";
    }

    let startDateMoment = competition.startDate ? moment(competition.startDate).utc() : moment.utc().startOf('day');

    let eventChanged = function(event, revertFunc) {
      let update = {
        nthDay: event.start.diff(startDateMoment, 'days'),
        startMinutes: event.start.hour()*60 + event.start.minute(),
        durationMinutes: event.end.diff(event.start, 'minutes'),
      };

      let successCount = ScheduleEvents.update(event.id, { $set: update });
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
        let newEventData = {
          competitionId: competitionId,
          nthDay: date.diff(startDateMoment, 'days'),
          startMinutes: date.utc().get('hour')*60 + date.utc().get('minute'),
          durationMinutes: ScheduleEvent.DEFAULT_DURATION.asMinutes(),
        };

        let droppedRoundId = $(this).data('round-id');
        if(droppedRoundId) {
          Meteor.call('addScheduleEvent', competitionId, newEventData, droppedRoundId);
          $(this).draggable({ disabled: true });
        } else {
          eventToEditReact.set(newEventData);
          $editModal.modal('show');
        }
      },
      events: function(start, end, timezone, callback) {
        let calEvents = [];

        dbScheduleEvents.forEach(dbEvent => {
          // startDateMoment is guaranteed to be in UTC, so there's no
          // weirdness here with adding time to a midnight that is about to
          // experience DST.
          let day = startDateMoment.clone().add(dbEvent.nthDay, 'days');
          let start = day.clone().add(dbEvent.startMinutes, 'minutes');
          let end = start.clone().add(dbEvent.durationMinutes, 'minutes');
          let calEvent = {
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
    let data = Template.currentData();
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
    let options = [];
    for(let i = 0; i < Competitions.findOne(this.competitionId).numberOfDays; i++) {
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
    let eventToEdit = eventToEditReact.get();
    assert(eventToEdit._id);
    Meteor.call('removeScheduleEvent', eventToEdit._id, function(err, result) {
      if(!err) {
        template.$('#deleteEventConfirmModal').modal('hide');
        template.$('#editEventModal').modal('hide');
        activateDraggable();
      } else {
        console.error("Meteor.call() error: " + err);
      }
    });
  },
});
