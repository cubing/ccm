MochaWeb.testOnly(function() {
  describe('Methods', function() {

    it('deleteCompetition', function() {
      var comp1Id = Competitions.insert({ competitionName: "Comp One", listed: false, startDate: new Date() });
      var comp2Id = Competitions.insert({ competitionName: "Comp Two", listed: false, startDate: new Date() });

      [comp1Id, comp2Id].forEach(function(compId) {
        var roundId = Rounds.insert({ competitionId: compId, eventCode: '333' });
        RoundProgresses.insert({ competitionId: compId, roundId: roundId });
      });

      chai.expect(Competitions.find().count()).to.equal(2);
      chai.expect(Rounds.find().count()).to.equal(2);
      chai.expect(RoundProgresses.find().count()).to.equal(2);

      stubs.create('tICMC', global, 'throwIfCannotManageCompetition');

      Meteor.call('deleteCompetition', comp1Id);

      chai.expect(Competitions.find().count()).to.equal(1);
      chai.expect(Rounds.find().count()).to.equal(1);
      chai.expect(RoundProgresses.find().count()).to.equal(1);
    });
  });

  beforeEach(function() {
    [Competitions, Rounds, RoundProgresses].forEach(function(collection) {
      collection.remove({});
    });
  });

  afterEach(function() {
    stubs.restoreAll();
  });
});
