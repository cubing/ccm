MochaWeb.testOnly(function() {

  describe('ScheduleEvent', function() {

    it('CONSTANTS', function() {
      chai.expect(ScheduleEvent.MIN_DURATION.asMinutes()).to.equal(30);
      chai.expect(ScheduleEvent.DEFAULT_DURATION.asMinutes()).to.equal(60);
    });

    describe('validation', function() {
      var compId;

      it('is within competition', function() {
        comp = make(Competitions);
        compId = comp._id;

        newEvent(); // valid

        chai.expect(function() {
          newEvent({startMinutes: -60});
        }).to.throw(/Start time must be at least 0/);

        newEvent({nthDay: 1}); // Day 2 of 2 -  valid

        chai.expect(function() {
          newEvent({nthDay: 2}); // Day 3 of 2
        }).to.throw(/Event scheduled on day after competition ended/);

        chai.expect(function() {
          newEvent({startMinutes: comp.calendarStartMinutes - 10});
        }).to.throw(/Event scheduled before competition day starts/);

        chai.expect(function() {
          newEvent({startMinutes: comp.calendarEndMinutes - 10});
        }).to.throw(/Event scheduled after competition day ends/);

        chai.expect(function() {
          newEvent({startMinutes: - 10});
        }).to.throw(/Start time must be at least 0/);
      });

      function newEvent(properties) {
        make(ScheduleEvents, _.extend({ competitionId: compId }, properties));
      }
    });
  });
});
