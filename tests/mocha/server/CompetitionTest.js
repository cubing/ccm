MochaWeb.testOnly(function() {
  describe('Competition', function () {

    describe('validation', function () {
      var event, comp;

      it('includes existing events', function () {
        comp  = make(Competitions, {calendarStartMinutes: 800, calendarEndMinutes: 1100});
        event = make(ScheduleEvents, {competitionId: comp._id, startMinutes: 900, durationMinutes: 100});

        chai.expect(function() {
          Competitions.update(comp._id,  { $set: { calendarStartMinutes: event.startMinutes + 10 }});
        }).to.throw(/Earlier events exist/);

        chai.expect(function() {
          Competitions.update(comp._id, { $set: { calendarEndMinutes: event.endMinutes() - 10 }});
        }).to.throw(/Later events exist./);
      });

      it('starts before it ends', function () {
        chai.expect(function() {
          make(Competitions, {calendarStartMinutes: 800, calendarEndMinutes: 700});
        }).to.throw(/End time must be after start time./);

        // Note that this validation does NOT work if only one of the fields are updated
      });

      it('registration interval is consistent', function () {
        make(Competitions, {registrationOpenDate: 10, registrationCloseDate: 20});

        chai.expect(function() {
          make(Competitions, {registrationOpenDate: 30, registrationCloseDate: 20});
        }).to.throw(/Registration close date should be after the registration open date/);

        chai.expect(function() {
          make(Competitions, {registrationOpenDate: 10});
        }).to.throw(/Please enter a registration close date/);

        chai.expect(function() {
          make(Competitions, {registrationCloseDate: 20});
        }).to.throw(/Please enter a registration open date/);
      });
    });

  });
});

