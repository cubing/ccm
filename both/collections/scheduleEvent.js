
// Add functions to the Mongo object, using transform (see http://docs.meteor.com/#/full/mongo_collection)
ScheduleEvent = function(doc) {
  _.extend(this, doc);
};

ScheduleEvent.MIN_DURATION = moment.duration(30, 'minutes');
ScheduleEvent.DEFAULT_DURATION = moment.duration(60, 'minutes');

_.extend(ScheduleEvent.prototype, {

  endMinutes: function() {
    return this.startMinutes + this.durationMinutes;
  },
  isScheduled: function() {
    // Events scheduled for times outside of the range shown by our calendar
    // are considered unscheduled. // TODO Maybe this wasn't broken before but it is now.  - Lars
    var competition = Competitions.findOne(this.competitionId, {
      fields: {
        numberOfDays: 1,
        calendarStartMinutes: 1,
        calendarEndMinutes: 1,
      }
    });
    assert(competition);
    if(this.nthDay < 0 || this.nthDay >= competition.numberOfDays) {
      return false;
    }
    if(this.endMinutes() < competition.calendarStartMinutes) {
      return false;
    }
    if(this.startMinutes > competition.calendarEndMinutes) {
      return false;
    }
    return true;
  },
});

ScheduleEvents = new Mongo.Collection("scheduleEvents", { transform: function(doc) { return new ScheduleEvent(doc); } });

ScheduleEvents.attachSchema({
  competitionId: {
    type: String,
  },

  roundId: {
    type: String,
    optional: true,
//    index: true, // Bug reported: https://github.com/aldeed/meteor-collection2/issues/212
//    unique: true,
  },

  nthDay: {
    type: Number,
    min: 0,
    // should be <= numberOfDays in the corresponding Competition
    defaultValue: 0,
  },

  startMinutes: {
    // The time at which the round starts (stored as an offset from midnight in
    // minutes assuming no leap time or DST or anything. This means that 60*1.5
    // (1:30 AM) is sometimes ambiguous because sometimes there are multiple
    // 1:30 AMs in a given day.
    type: Number,
    label: "Start time",
    min: 0,
    max: moment.duration(1, 'day').asMinutes(),
    optional: true,
    autoform: {
      afFieldInput: {
        type: "timeOfDayMinutes"
      }
    }
  },
  durationMinutes: {
    type: Number,
    min: ScheduleEvent.MIN_DURATION.asMinutes(),
    defaultValue: ScheduleEvent.DEFAULT_DURATION.asMinutes(),
  },

  title: {
    type: String,
  },
});

if(Meteor.isServer) {
  ScheduleEvents._ensureIndex({
    competitionId: 1,
  });
}
