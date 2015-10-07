MochaWeb.testOnly(function() {
  describe('Methods', function() {
    var comp1Id, comp2Id;
    beforeEach(function() {
      [Competitions, Rounds, RoundProgresses, Registrations].forEach(function(collection) {
        collection.remove({});
      });
      stubs.create('Fake login', global, 'throwIfCannotManageCompetition');

      comp1Id = Competitions.insert({ competitionName: "Comp One", listed: false, startDate: new Date() });
      comp2Id = Competitions.insert({ competitionName: "Comp Two", listed: false, startDate: new Date() });
    });
    afterEach(function() {
      stubs.restoreAll();
    });

    it('deleteCompetition', function() {
      [comp1Id, comp2Id].forEach(function(compId) {
        var roundId = make(Rounds, { competitionId: compId, eventCode: '333', nthRound: 1, totalRounds: 1 })._id;
        RoundProgresses.insert({ competitionId: compId, roundId: roundId });
      });

      chai.expect(Competitions.find().count()).to.equal(2);
      chai.expect(Rounds.find().count()).to.equal(2);
      chai.expect(RoundProgresses.find().count()).to.equal(2);

      Meteor.call('deleteCompetition', comp1Id);

      chai.expect(Competitions.find().count()).to.equal(1);
      chai.expect(Rounds.find().count()).to.equal(1);
      chai.expect(RoundProgresses.find().count()).to.equal(1);
    });

    it('addRound and removeLastRound', function() {
      Meteor.call('addRound', comp1Id, '333');
      Meteor.call('addRound', comp1Id, '444'); // decoy
      Meteor.call('addRound', comp2Id, '333'); // decoy

      var rounds = Rounds.find({competitionId: comp1Id, eventCode: '333'}).fetch();
      chai.expect(rounds.length).to.equal(1);
      chai.expect(RoundProgresses.find({roundId: rounds[0]._id}).count()).to.equal(1);
      chai.expect(rounds[0].totalRounds).to.equal(1);

      Meteor.call('addRound', comp1Id, '333');

      rounds = Rounds.find({competitionId: comp1Id, eventCode: '333'}, {sort: {nthRound: 1}}).fetch();
      chai.expect(rounds.length).to.equal(2);
      chai.expect(rounds[0].nthRound).to.equal(1);
      chai.expect(rounds[0].totalRounds).to.equal(2);
      chai.expect(rounds[0].roundCode()).to.equal('1');
      chai.expect(rounds[1].nthRound).to.equal(2);
      chai.expect(rounds[1].totalRounds).to.equal(2);
      chai.expect(rounds[1].roundCode()).to.equal('f');

      Meteor.call('removeLastRound', comp1Id, '333');

      rounds = Rounds.find({competitionId: comp1Id, eventCode: '333'}).fetch();
      chai.expect(rounds.length).to.equal(1);
      chai.expect(RoundProgresses.find({roundId: rounds[0]._id}).count()).to.equal(1);
      chai.expect(rounds[0].totalRounds).to.equal(1);

      Meteor.call('removeLastRound', comp1Id, '333');

      chai.expect(Rounds.find({competitionId: comp1Id, eventCode: '333'}).count()).to.equal(0);

      chai.expect(function() {
        Meteor.call('removeLastRound', comp1Id, '333');
      }).to.throw(Meteor.Error);
    });

    it('addRound respects wca.MAX_ROUNDS_PER_EVENT', function() {
      for(var i = 0; i < wca.MAX_ROUNDS_PER_EVENT; i++) {
        Meteor.call('addRound', comp1Id, '333');
      }
      chai.expect(function() {
        Meteor.call('addRound', comp1Id, '333');
      }).to.throw(Meteor.Error);
    });

    describe('manage check-in', function() {
      var registration;
      var firstRound333;
      beforeEach(function() {
        Meteor.call('addRound', comp1Id, '333');
        firstRound333 = Rounds.findOne({competitionId: comp1Id, eventCode: '333', nthRound: 1});
        registration = make(Registrations, {competitionId: comp1Id});
      });

      describe('when not checked in', function() {
        it('toggleEventRegistration', function() {
          Meteor.call('toggleEventRegistration', registration._id, '333');
          chai.expect(Results.find({registrationId: registration._id, eventCode: '333', nthRound: 1}).count()).to.equal(0);
          chai.expect(Registrations.findOne(registration._id).registeredEvents).to.deep.equal(['333']);
        });
      });

      describe('when checked in for 333', function() {
        var result;
        beforeEach(function() {
          Meteor.call('checkInRegistration', registration._id, true);
          Meteor.call('toggleEventRegistration', registration._id, '333');
          var results = Results.find({registrationId: registration._id, roundId: firstRound333._id}).fetch();
          chai.expect(results.length).to.equal(1);
          result = results[0];
        });

        it('created a Result', function() {
          chai.expect(Registrations.findOne(registration._id).checkedIn).to.equal(true);
          chai.expect(Registrations.findOne(registration._id).registeredEvents).to.deep.equal(['333']);
        });

        it('unregistering without times works', function() {
          Meteor.call('checkInRegistration', registration._id, false);
          chai.expect(Results.findOne(result._id)).to.not.exist;
          chai.expect(Registrations.findOne(registration._id).checkedIn).to.equal(false);
        });

        it('unregistering with times throws an exception', function() {
          Meteor.call('setSolveTime', result._id, 0, { millis: 3333 });
          chai.expect(function() {
            Meteor.call('checkInRegistration', registration._id, false);
          }).to.throw(Meteor.Error);
          chai.expect(Results.findOne(result._id)).to.exist;
          chai.expect(Registrations.findOne(registration._id).checkedIn).to.equal(true);
        });
      });
    });
  });
});
