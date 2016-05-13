
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
  displayTitle: function() {
    return this.roundId ? Rounds.findOne(this.roundId).displayTitle() : this.title;
  }
});

ScheduleEvents = new Mongo.Collection("scheduleEvents", {
  transform: function(doc) {
    return new ScheduleEvent(doc);
  }
});

Schema.scheduleEvent = new SimpleSchema({
  competitionId: {
    type: String,
  },

  roundId: {
    type: String,
    optional: true,
    //index: true, // Bug reported: https://github.com/aldeed/meteor-collection2/issues/212
    //unique: true,
  },

  nthDay: {
    type: Number,
    min: 0,
    label: 'Day of competition',
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
    },
    custom: function() {
      // SimpleSchema has no place to do multi field validations, so we arbitrarily do this here.
      let obj = validationObject(this, ['nthDay', 'startMinutes', 'durationMinutes', 'competitionId']);

      let compId = obj.competitionId || ScheduleEvents.findOne(obj.id).competitionId;
      let comp = Competitions.findOne(compId);

      if(obj.nthDay >= comp.numberOfDays) {
        return "tooLateDay";
      }
      if(obj.startMinutes < comp.calendarStartMinutes) {
        return "tooEarly";
      }
      if(obj.startMinutes + obj.durationMinutes > comp.calendarEndMinutes) {
        return "tooLate";
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

Schema.scheduleEvent.messages({
  tooLateDay: "Event scheduled on day after competition ended.",
  tooEarly: "Event scheduled before competition day starts.",
  tooLate: "Event scheduled after competition day ends.",
});

ScheduleEvents.attachSchema(Schema.scheduleEvent);

if(Meteor.isServer) {
  ScheduleEvents._ensureIndex({
    competitionId: 1,
  });
}
