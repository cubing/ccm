MochaWeb.testOnly(function() {
  describe('helpers', function() {

    describe('.getEvents', function() {
      let comp;
      beforeEach(function() {
        comp = make(Competitions);
      });

      it('returns events in expected format', function() {
        chai.expect(comp.getEvents()).to.deep.equal([]);

        make(Rounds, {competitionId: comp._id, eventCode: '333'});
        make(Rounds, {competitionId: 'other competition', eventCode: '666'});

        chai.expect(comp.getEvents()).to.deep.equal([{competitionId: comp._id, eventCode: '333'}]);
      });

      it('returns events in WCA order', function() {
        ['333', '222', '333mbf', '777', 'clock'].forEach(code => {
          make(Rounds, {competitionId: comp._id, eventCode: code});
        });
        chai.expect(_.pluck(comp.getEvents(), 'eventCode').join()).to.equal('333,222,clock,777,333mbf');
      });
    });
  });
});
