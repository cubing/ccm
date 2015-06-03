MochaWeb.testOnly(function() {
  describe('Round', function() {
    it('format()', function() {
      chai.expect(makeRound({ formatCode: '2' }).format().name).to.equal("Best of 2");
      chai.expect(makeRound({ formatCode: 'a' }).format().name).to.equal("Average of 5");
    });

    it('resultSortOrder()', function() {
      chai.expect(makeRound({ formatCode: '1' }).resultSortOrder()).to.deep.equal({sortableBestValue: 1}); // sortBy: "best"
      chai.expect(makeRound({ formatCode: 'a' }).resultSortOrder()).to.deep.equal({sortableAverageValue: 1, sortableBestValue: 1}); // sortBy: "average"
    });

    it('properties()', function() {
      chai.expect(makeRound({ nthRound: 1, totalRounds: 2 }).properties().name).to.equal("First round");
      chai.expect(makeSoftCutoffRound({ nthRound: 3, totalRounds: 4 }).properties().name).to.equal("Combined Third Round");
    });

    it('eventName()', function() {
      chai.expect(makeRound({ eventCode: '333bf' }).eventName()).to.equal("Rubik's Cube: Blindfolded");
    });

    it('eventSolveTimeFields()', function() {
      chai.expect(makeRound({ eventCode: '333mbf' }).eventSolveTimeFields().join()).to.equal("millis,puzzlesSolvedCount,puzzlesAttemptedCount");
      chai.expect(makeRound({ eventCode: '777' }).eventSolveTimeFields()).to.be.undefined;
    });

    it('roundCode()', function() {
      chai.expect(makeRound({ nthRound: 1, totalRounds: 2 }).roundCode()).to.equal('1');
      chai.expect(makeRound({ nthRound: 2, totalRounds: 2 }).roundCode()).to.equal('f');
      chai.expect(makeRound({ nthRound: 3, totalRounds: 4 }).roundCode()).to.equal('3');
      chai.expect(makeSoftCutoffRound({ nthRound: 2, totalRounds: 3 }).roundCode()).to.equal('e');
      chai.expect(makeSoftCutoffRound({ nthRound: 4, totalRounds: 4 }).roundCode()).to.equal('c');
    });

    it('status convenience functions', function() {
      var unstarted = makeRound({ status: 'unstarted' });
      var open = makeRound({ status: 'open' });
      var closed = makeRound({ status: 'closed' });

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
      chai.expect(makeRound({eventCode: 'skewb', nthRound: 1, totalRounds: 2}).displayTitle()).to.equal('Skewb: Round 1 of 2');
      chai.expect(makeRound({eventCode: 'skewb', nthRound: 1, totalRounds: 1}).displayTitle()).to.equal('Skewb: Single Round');
    });

    it('isLast()', function() {
      chai.expect(makeRound({nthRound: 1, totalRounds: 2}).isLast()).to.be.false;
      chai.expect(makeRound({nthRound: 2, totalRounds: 2}).isLast()).to.be.true;
    });
  });

  function makeRound(properties) {
    return Rounds.findOne(Rounds.insert(_.extend({ competitionId: 'fake', nthRound: 1, totalRounds: 1 }, properties)));
  }
  function makeSoftCutoffRound(properties) {
    return makeRound(_.extend({softCutoff: { time: {}, formatCode: '2'} }, properties));
  }
});
