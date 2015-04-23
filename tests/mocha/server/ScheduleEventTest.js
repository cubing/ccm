MochaWeb.testOnly(function() {
  describe('ScheduleEvent', function() {
    it('CONSTANTS', function() {
      chai.expect(ScheduleEvent.MIN_DURATION.asMinutes()).to.equal(30);
      chai.expect(ScheduleEvent.DEFAULT_DURATION.asMinutes()).to.equal(60);
    });
  });
});
