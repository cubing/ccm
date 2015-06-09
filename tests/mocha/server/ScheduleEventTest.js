MochaWeb.testOnly(function() {

  describe('ScheduleEvent', function() {
    var compId;

    it('CONSTANTS', function() {
      chai.expect(ScheduleEvent.MIN_DURATION.asMinutes()).to.equal(30);
      chai.expect(ScheduleEvent.DEFAULT_DURATION.asMinutes()).to.equal(60);
    });

    describe('validation', function() {
      it('validates', function() {
        comp = Competitions.findOne(compId);

        newEvent(); // valid

        chai.expect(function() {
          newEvent({startMinutes: -60});
        }).to.throw(Meteor.Error('Error: Start time must be at least 0'));

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
    });

    beforeEach(function() {
      compId = Competitions.insert({ competitionName: "Comp One", numberOfDays: 2, calendarStartMinutes: 600, calendarEndMinutes: 1200, listed: false, startDate: new Date() });
    });

    function newEvent(properties) {
      return ScheduleEvents.insert(_.extend({ competitionId: compId, roundId: null, title: "whatevs", startMinutes: 900, durationMinutes: 30 }, properties));
    }
  });

});
