MochaWeb.testOnly(function() {
  describe('helpers', function() {

    describe('getCompetitionEvents', function() {
      var compId = Competitions.insert({ competitionName: "Comp Etition", listed: false, startDate: new Date() });

      it('returns events in expected format', function() {
        chai.expect(getCompetitionEvents(null)).to.deep.equal([]);
        chai.expect(getCompetitionEvents(compId)).to.deep.equal([]);

        makeRound({ competitionId: compId, eventCode: '333' });
        makeRound({ competitionId: 'other competition', eventCode: '666' });

        chai.expect(getCompetitionEvents(compId)).to.deep.equal([{competitionId: compId, eventCode: '333'}]);
      });

      it('returns events in WCA order', function() {
        ['333', '222', '333mbf', '777', 'clock'].forEach(function(code) {
          makeRound({ competitionId: compId, eventCode: code });
        });
        chai.expect(_.pluck(getCompetitionEvents(compId), 'eventCode').join()).to.equal('222,333,777,clock,333mbf');
      });
    });

  });

  function makeRound(properties) {
    return Rounds.findOne(Rounds.insert(_.extend({ competitionId: 'fake', nthRound: 1, totalRounds: 1 }, properties)));
  }
});
