MochaWeb.testOnly(function() {
  describe('Methods', function() {

    it('deleteCompetition (DOES NOT WORK)', function() {
      // Need to figure out how to either Log in a User, or mock out the user check.

//      var preComps = Competitions.find().count();
//      var preRounds = Rounds.find().count();
//      var preProgs = RoundProgresses.find().count();
//
//      var comp1Id = Competitions.insert({ competitionName: "Comp One", listed: false, startDate: new Date() });
//      var comp2Id = Competitions.insert({ competitionName: "Comp Two", listed: false, startDate: new Date() });
//
//      [comp1Id, comp2Id].forEach(function(compId) {
//        var roundId = Rounds.insert({ competitionId: compId, eventCode: '333' });
//        RoundProgresses.insert({ competitionId: compId, roundId: roundId });
//      });
//
//      chai.expect(Competitions.find().count() - preComps).to.equal(2);
//      chai.expect(Rounds.find().count() - preRounds).to.equal(2);
//      chai.expect(RoundProgresses.find().count() - preProgs).to.equal(2);
//
//
//      var old = throwIfCannotManageCompetition;
//      throwIfCannotManageCompetition = function(userId, competitionId) {};
//
//      Meteor.call('deleteCompetition', comp1Id);
//
//      throwIfCannotManageCompetition = old;
//
//      chai.expect(Competitions.find().count() - preComps).to.equal(1);
//      chai.expect(Rounds.find().count() - preRounds).to.equal(1);
//      chai.expect(RoundProgresses.find().count() - preProgs).to.equal(1);

    });
  });
});
