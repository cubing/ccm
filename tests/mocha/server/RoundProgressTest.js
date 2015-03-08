MochaWeb.testOnly(function() {
  describe('RoundProgress', function() {

    it('percentage()', function() {
      chai.expect(makeProgress({done: 5, total: 10}).percentage()).to.equal(50);
      chai.expect(makeProgress({done: 2.47, total: 10}).percentage()).to.equal(25);
      chai.expect(makeProgress({done: 5, total:  0}).percentage()).to.equal(0);
    });

    it('isComplete()', function() {
      chai.expect(makeProgress({done:  9, total: 10}).isComplete()).to.be.false;
      chai.expect(makeProgress({done: 10, total: 10}).isComplete()).to.be.true;
      chai.expect(makeProgress({done: 11, total: 10}).isComplete()).to.be.false;
    });
    it('isOverComplete()', function() {
      chai.expect(makeProgress({done:  9, total: 10}).isOverComplete()).to.be.false;
      chai.expect(makeProgress({done: 10, total: 10}).isOverComplete()).to.be.false;
      chai.expect(makeProgress({done: 11, total: 10}).isOverComplete()).to.be.true;
    });
  });

  function makeProgress(properties) {
    return RoundProgresses.findOne(RoundProgresses.insert(_.extend({ roundId: 'Fake', competitionId: 'fake'}, properties)));
  }

});
