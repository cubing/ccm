MochaWeb.testOnly(function() {
  describe('RoundProgress', function() {
    it('percentage()', function() {
      chai.expect(make(RoundProgresses, {done: 5, total: 10}).percentage()).to.equal(50);
      chai.expect(make(RoundProgresses, {done: 2.47, total: 10}).percentage()).to.equal(25);
      chai.expect(make(RoundProgresses, {done: 5, total:  0}).percentage()).to.equal(0);
    });

    it('completeness()', function() {
      chai.expect(make(RoundProgresses, {done:  9, total: 10}).completeness()).to.equal('incomplete');
      chai.expect(make(RoundProgresses, {done: 10, total: 10}).completeness()).to.equal('complete');
      chai.expect(make(RoundProgresses, {done: 11, total: 10}).completeness()).to.equal('overcomplete');
    });
  });
});
