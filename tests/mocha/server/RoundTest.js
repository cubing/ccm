MochaWeb.testOnly(function() {
  describe('Round', function() {
    var lunch = makeRound({ title: 'lunch' });

    it('CONSTANTS', function() {
      chai.expect(Round.MIN_ROUND_DURATION_MINUTES).to.equal(30);
      chai.expect(Round.DEFAULT_ROUND_DURATION_MINUTES).to.equal(60);
    });

    it('format()', function() {
      chai.expect(makeRound({ formatCode: '2' }).format().name).to.equal("Best of 2");
      chai.expect(makeRound({ formatCode: 'a' }).format().name).to.equal("Average of 5");
      chai.expect(lunch.format()).to.be.undefined;
    });

    it('resultSortOrder()', function() {
      chai.expect(makeRound({ formatCode: '1' }).resultSortOrder()).to.deep.equal({sortableBestValue: 1}); // sortBy: "best"
      chai.expect(makeRound({ formatCode: 'a' }).resultSortOrder()).to.deep.equal({sortableAverageValue: 1, sortableBestValue: 1}); // sortBy: "average"
    });

    it('properties()', function() {
      chai.expect(makeRound({ roundCode: '1' }).properties().name).to.equal("First round");
      chai.expect(makeRound({ roundCode: 'g' }).properties().name).to.equal("Combined Third Round");
      chai.expect(lunch.properties()).to.be.undefined;
    });

    it('eventName()', function() {
      chai.expect(makeRound({ eventCode: '333bf' }).eventName()).to.equal("Rubik's Cube: Blindfolded");
    });

    it('eventSolveTimeFields()', function() {
      chai.expect(makeRound({ eventCode: '333mbf' }).eventSolveTimeFields().join()).to.equal("millis,puzzlesSolvedCount,puzzlesAttemptedCount");
      chai.expect(makeRound({ eventCode: '777' }).eventSolveTimeFields()).to.be.undefined;
    });

    it('status convenience functions', function() {
      var unstarted = makeRound({ status: 'unstarted' });
      var open = makeRound({ status: 'open' });
      var closed = makeRound({ status: 'closed' });

      chai.expect(unstarted.isUnstarted()).to.be.true;
      chai.expect(open.isUnstarted()).to.be.false;
      chai.expect(closed.isUnstarted()).to.be.false;
      chai.expect(lunch.isUnstarted()).to.be.true;

      chai.expect(unstarted.isOpen()).to.be.false;
      chai.expect(open.isOpen()).to.be.true;
      chai.expect(closed.isOpen()).to.be.false;
      chai.expect(lunch.isOpen()).to.be.false;

      chai.expect(unstarted.isClosed()).to.be.false;
      chai.expect(open.isClosed()).to.be.false;
      chai.expect(closed.isClosed()).to.be.true;
      chai.expect(lunch.isClosed()).to.be.false;
    });
  });

  function makeRound(properties) {
    return Rounds.findOne(Rounds.insert(_.extend({ competitionId: 'fake'}, properties)));
  }
});
