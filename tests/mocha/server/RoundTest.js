MochaWeb.testOnly(function() {
  describe('Round', function() {
    it('format()', function() {
      chai.expect(make(Rounds, { formatCode: '2' }).format().name).to.equal("Best of 2");
      chai.expect(make(Rounds, { formatCode: 'a' }).format().name).to.equal("Average of 5");
    });

    it('resultSortOrder()', function() {
      chai.expect(make(Rounds, { formatCode: '1' }).resultSortOrder()).to.deep.equal({sortableBestValue: 1}); // sortBy: "best"
      chai.expect(make(Rounds, { formatCode: 'a' }).resultSortOrder()).to.deep.equal({sortableAverageValue: 1, sortableBestValue: 1}); // sortBy: "average"
    });

    it('properties()', function() {
      chai.expect(make(Rounds, { nthRound: 1, totalRounds: 2 }).properties().name).to.equal("First round");
      chai.expect(make(Rounds, 'softCutoff', { nthRound: 3, totalRounds: 4 }).properties().name).to.equal("Combined Third Round");
    });

    it('eventName()', function() {
      chai.expect(make(Rounds, { eventCode: '333bf' }).eventName()).to.equal("Rubik's Cube: Blindfolded");
    });

    it('eventSolveTimeFields()', function() {
      chai.expect(make(Rounds, { eventCode: '333mbf' }).eventSolveTimeFields().join()).to.equal("millis,puzzlesSolvedCount,puzzlesAttemptedCount");
      chai.expect(make(Rounds, { eventCode: '777' }).eventSolveTimeFields()).to.be.undefined;
    });

    it('roundCode()', function() {
      chai.expect(make(Rounds, { nthRound: 1, totalRounds: 2 }).roundCode()).to.equal('1');
      chai.expect(make(Rounds, { nthRound: 2, totalRounds: 2 }).roundCode()).to.equal('f');
      chai.expect(make(Rounds, { nthRound: 3, totalRounds: 4 }).roundCode()).to.equal('3');
      chai.expect(make(Rounds, 'softCutoff', { nthRound: 2, totalRounds: 3 }).roundCode()).to.equal('e');
      chai.expect(make(Rounds, 'softCutoff', { nthRound: 4, totalRounds: 4 }).roundCode()).to.equal('c');
    });

    it('status convenience functions', function() {
      var unstarted = make(Rounds, { status: 'unstarted' });
      var open = make(Rounds, { status: 'open' });
      var closed = make(Rounds, { status: 'closed' });

      chai.expect(unstarted.isUnstarted()).to.be.true;
      chai.expect(open.isUnstarted()).to.be.false;
      chai.expect(closed.isUnstarted()).to.be.false;

      chai.expect(unstarted.isOpen()).to.be.false;
      chai.expect(open.isOpen()).to.be.true;
      chai.expect(closed.isOpen()).to.be.false;

      chai.expect(unstarted.isClosed()).to.be.false;
      chai.expect(open.isClosed()).to.be.false;
      chai.expect(closed.isClosed()).to.be.true;
    });

    it('displayTitle()', function() {
      chai.expect(make(Rounds, {eventCode: 'skewb', nthRound: 1, totalRounds: 2}).displayTitle()).to.equal('Skewb: Round 1 of 2');
      chai.expect(make(Rounds, {eventCode: 'skewb', nthRound: 1, totalRounds: 1}).displayTitle()).to.equal('Skewb: Single Round');
    });

    it('isLast()', function() {
      chai.expect(make(Rounds, {nthRound: 1, totalRounds: 2}).isLast()).to.be.false;
      chai.expect(make(Rounds, {nthRound: 2, totalRounds: 2}).isLast()).to.be.true;
    });
  });
});
