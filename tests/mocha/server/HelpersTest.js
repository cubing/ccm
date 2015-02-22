MochaWeb.testOnly(function(){
  describe('helpers', function() {

    describe('getCompetitionEvents', function() {
      it('gets events', function() {
        chai.expect(getCompetitionEvents(null)).to.deep.equal([]);

        var compId = Competitions.insert({ competitionName: "Comp One", listed: false, startDate: new Date() });
        chai.expect(getCompetitionEvents(compId)).to.deep.equal([]);

        Rounds.insert({ competitionId: compId, eventCode: '333', formatCode: '2', roundCode: 'f', nthRound: 1 });
        Rounds.insert({ competitionId: compId, title: 'non competition' });

        chai.expect(getCompetitionEvents(compId)).to.deep.equal([{competitionId: compId, eventCode: '333'}]);

        Rounds.insert({ competitionId: compId, eventCode: '222', formatCode: '2', roundCode: 'f', nthRound: 1 });

        // This assumes Mongo returns things in this order. Order independent deep comparison in Chai is strangely hard.
        chai.expect(getCompetitionEvents(compId)).to.deep.equal([{competitionId: compId, eventCode: '222'}, {competitionId: compId, eventCode: '333'}]);
      });
    });

  });
});