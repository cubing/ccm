MochaWeb.testOnly(function() {
  describe('Methods', function() {
    let comp1Id, comp2Id;
    let siteAdminUserId;
    beforeEach(function() {
      comp1Id = Competitions.insert({ competitionName: "Comp One", listed: false, startDate: new Date() });
      comp2Id = Competitions.insert({ competitionName: "Comp Two", listed: false, startDate: new Date() });

      siteAdminUserId = make(Meteor.users, { siteAdmin: true })._id;

      stubs.create('fakeCanManageCompetition', global, 'getCannotManageCompetitionReason');
      stubs.fakeCanManageCompetition.returns(null);
    });

    it('createCompetition', function() {
      let createCompetition = Meteor.server.method_handlers.createCompetition;
      let competitionId = createCompetition.call({ userId: siteAdminUserId }, "Test Competition", new Date());
      let competition = Competitions.findOne(competitionId);
      chai.expect(competition.competitionName).to.equal("Test Competition");

      let registration = Registrations.findOne({ competitionId });
      chai.expect(registration.userId).to.equal(siteAdminUserId);
      chai.expect(registration.roles).to.deep.equal({ organizer: true });
    });

    it('uploadCompetition', function() {
      let uploadCompetition = Meteor.server.method_handlers.uploadCompetition;
      let wcaCompetition = {
        "formatVersion": "WCA Competition 0.2",
        "competitionId": "PleaseBeQuiet2015",
        "persons": [
          {
            "id": "1",
            "name": "Jeremy Fleischman",
            "countryId": "US",
            "wcaId": "2005FLEI01",
            "dob": "2014-10-11"
          },
          {
            "id": "2",
            "name": "Patricia Li",
            "wcaId": "2009LIPA01",
            "dob": "2015-09-04"
          }
        ],
        "events": [
          {
            "eventId": "333",
            "rounds": [
              {
                "roundId": "f",
                "formatId": "a",
                "results": [
                  { "personId": "1" },
                  { "personId": "2" },
                ],
                "groups": []
              }
            ]
          },
          {
            "eventId": "333oh",
            "rounds": [
              {
                "roundId": "f",
                "formatId": "a",
                "results": [
                  { "personId": "1" },
                ],
                "groups": []
              }
            ]
          },
          {
            "eventId": "222",
            "rounds": [
              {
                "roundId": "f",
                "formatId": "a",
                "results": [],
                "groups": []
              }
            ]
          },
        ],
      };
      let competition = uploadCompetition.call({ userId: siteAdminUserId }, wcaCompetition, new Date());
      chai.expect(competition.wcaCompetitionId).to.equal("PleaseBeQuiet2015");
    });

    it('deleteCompetition', function() {
      [comp1Id, comp2Id].forEach(compId => {
        let roundId = make(Rounds, { competitionId: compId, eventCode: '333', nthRound: 1, totalRounds: 1 })._id;
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

      let rounds = Rounds.find({competitionId: comp1Id, eventCode: '333'}).fetch();
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
      for(let i = 0; i < wca.MAX_ROUNDS_PER_EVENT; i++) {
        Meteor.call('addRound', comp1Id, '333');
      }
      chai.expect(function() {
        Meteor.call('addRound', comp1Id, '333');
      }).to.throw(Meteor.Error);
    });

    describe('advanceParticipantsFromRound', function() {
      it('works', function() {
        Meteor.call('addRound', comp1Id, '333');
        Meteor.call('addRound', comp1Id, '333');

        let rounds = Rounds.find({
          competitionId: comp1Id,
          eventCode: '333',
        }, {
          sort: {
            nthRound: 1,
          }
        }).fetch();

        let createRegistration = function({checkedIn}) {
          let registration = Registrations.findOne(Meteor.call('addEditRegistration', build(Registrations, {competitionId: comp1Id, registeredEvents: ['333']})));
          if(checkedIn) {
            Meteor.call('checkInRegistration', registration._id, true);
          }
          let result = Results.findOne({ roundId: rounds[0]._id, registrationId: registration._id });
          return [ registration, result ];
        };

        let [registration1, result1] = createRegistration({ checkedIn: true });
        fillResultWithSolve(result1, { millis: 3333 });

        let [registration2, result2] = createRegistration({ checkedIn: true });
        fillResultWithSolve(result2, { millis: 4444 });

        let [registration3, result3] = createRegistration({ checkedIn: true });
        fillResultWithSolve(result3, { millis: 5555 });

        let [uncheckedInRegistration, uncheckedInResult] = createRegistration({ checkedIn: false });
        let [registration4, incompleteResult4] = createRegistration({ checkedIn: true });

        let roundProgress = RoundProgresses.findOne({roundId: rounds[0]._id});
        chai.expect(roundProgress.done).to.equal(3);
        chai.expect(roundProgress.total).to.equal(4);

        Meteor.call('advanceParticipantsFromRound', 2, rounds[0]._id);
        chai.expect(Rounds.findOne(rounds[1]._id).size).to.equal(2);

        let results = Results.find({ roundId: rounds[1]._id }, { sort: { previousPosition: 1 } } ).fetch();
        chai.expect(results.length).to.equal(2);
        chai.expect(results[0].registrationId).to.equal(registration1._id);
        chai.expect(results[0].previousPosition).to.equal(1);
        chai.expect(results[1].registrationId).to.equal(registration2._id);
        chai.expect(results[1].previousPosition).to.equal(2);
        chai.expect(Results.findOne(result1._id).advanced).to.equal(true);
        chai.expect(Results.findOne(result2._id).advanced).to.equal(true);
        chai.expect(Results.findOne(result3._id).advanced).to.equal(false);
        chai.expect(Results.findOne(incompleteResult4._id).advanced).to.equal(false);
        chai.expect(Results.findOne(uncheckedInResult._id).advanced).to.equal(false);

        // Add a time for the slowest person in round 2
        Meteor.call('setSolveTime', results[results.length - 1]._id, 0, { millis: 3333 });
        // Now try to readvance with only 1 person, it should refuse to delete
        // the undesired result with data entered.
        chai.expect(function() {
          Meteor.call('advanceParticipantsFromRound', 1, rounds[0]._id);
        }).to.throw(Meteor.Error);
        chai.expect(Results.find({ roundId: rounds[1]._id }).count()).to.equal(2);
        chai.expect(Rounds.findOne(rounds[1]._id).size).to.equal(2);

        // Clear the solve time for the problematic user.
        Meteor.call('setSolveTime', results[results.length - 1]._id, 0, null);
        // Now we should be able to readvance with only 1 person, which should
        // delete a result.
        Meteor.call('advanceParticipantsFromRound', 1, rounds[0]._id);
        chai.expect(Results.find({ roundId: rounds[1]._id }).count()).to.equal(1);
        chai.expect(Rounds.findOne(rounds[1]._id).size).to.equal(1);
      });
    });

    describe("toggleGroupOpen", function() {
      let roundId;
      let groupId;
      beforeEach(function() {
        let round = make(Rounds, { status: wca.roundStatuses.open });
        roundId = round._id;
        groupId = make(Groups, { group: "A", roundId: round._id })._id;
      });

      it("works", function() {
        chai.expect(Groups.findOne(groupId).open).to.equal(false);
        Meteor.call('toggleGroupOpen', groupId);
        chai.expect(Groups.findOne(groupId).open).to.equal(true);
      });

      it("doesn't allow opening groups for closed rounds", function() {
        chai.expect(Groups.findOne(groupId).open).to.equal(false);

        Rounds.update(roundId, { $set: { status: wca.roundStatuses.closed } });
        chai.expect(function() {
          Meteor.call('toggleGroupOpen', groupId);
        }).to.throw(Meteor.Error);

        chai.expect(Groups.findOne(groupId).open).to.equal(false);
      });
    });

    describe("setSolveTime", function() {
      let firstRound333;
      let registration;
      let result;
      beforeEach(function() {
        Meteor.call('addRound', comp1Id, '333');
        firstRound333 = Rounds.findOne({competitionId: comp1Id, eventCode: '333', nthRound: 1});
        registration = Registrations.findOne(Meteor.call('addEditRegistration', build(Registrations, {competitionId: comp1Id})));

        Meteor.call('checkInRegistration', registration._id, true);
        Meteor.call('toggleEventRegistration', registration._id, '333');
        let results = Results.find({registrationId: registration._id, roundId: firstRound333._id}).fetch();
        chai.expect(results.length).to.equal(1);
        result = results[0];
      });

      it("can add times", function() {
        for(let i = 0; i < firstRound333.format().count; i++) {
          Meteor.call('setSolveTime', result._id, i, { millis: 3333 + i });
        }
        result = Results.findOne(result._id);
        chai.expect(result.solves.length).to.equal(5);
        chai.expect(result.solves[0].millis).to.equal(3333);
        chai.expect(result.solves[1].millis).to.equal(3334);
        chai.expect(result.solves[2].millis).to.equal(3335);
        chai.expect(result.solves[3].millis).to.equal(3336);
        chai.expect(result.solves[4].millis).to.equal(3337);
      });

      it("not allowed when not checked in", function() {
        Meteor.call('checkInRegistration', registration._id, false);
        chai.expect(function() {
          Meteor.call('setSolveTime', result._id, 0, { millis: 3333 });
        }).to.throw(Meteor.Error);
      });

      it("can't add more times than round allows", function() {
        let i;
        for(i = 0; i < firstRound333.format().count; i++) {
          Meteor.call('setSolveTime', result._id, i, { millis: 3333 + i });
        }
        chai.expect(function() {
          Meteor.call('setSolveTime', result._id, i, { millis: 3333 + i });
        }).to.throw(Meteor.Error);
      });

      it("can remove extra times", function() {
        // Add all 5 allowed solves for this round format.
        for(i = 0; i < firstRound333.format().count; i++) {
          Meteor.call('setSolveTime', result._id, i, { millis: 3333 + i });
        }
        // Change this round to a mean of 3, which means we have too many
        // solves in our result. We should be allowed to change and delete
        // these extra solves because they were grandfathered in.
        Rounds.update(firstRound333._id, { $set: { formatCode: "3" } });
        Meteor.call('setSolveTime', result._id, 3, null);
        chai.expect(Results.findOne(result._id).solves.length).to.equal(5);
        Meteor.call('setSolveTime', result._id, 3, { millis: 4242 });
        chai.expect(Results.findOne(result._id).solves.length).to.equal(5);
        Meteor.call('setSolveTime', result._id, 4, null);
        chai.expect(Results.findOne(result._id).solves.length).to.equal(4);
        Meteor.call('setSolveTime', result._id, 3, null);
        chai.expect(Results.findOne(result._id).solves.length).to.equal(3);

        // Now that we're down to the maximum of 3 solves, we should not be
        // allowed to add a 4th.
        chai.expect(function() {
          Meteor.call('setSolveTime', result._id, 3, { millis: 2323 });
        }).to.throw(Meteor.Error);

        Meteor.call('setSolveTime', result._id, 2, null);
        chai.expect(Results.findOne(result._id).solves.length).to.equal(2);
        Meteor.call('setSolveTime', result._id, 1, null);
        chai.expect(Results.findOne(result._id).solves.length).to.equal(1);
        Meteor.call('setSolveTime', result._id, 0, null);
        chai.expect(Results.findOne(result._id).solves.length).to.equal(0);
      });
    });

    describe("advancing extra participants", function() {
      let rounds;
      let registration1, result1;
      let registration2, result2;
      let uncheckedInRegistration, uncheckedInResult;
      let secondResult1;
      beforeEach(function() {
        Meteor.call('addRound', comp1Id, '333');
        Meteor.call('addRound', comp1Id, '333');
        rounds = Rounds.find({competitionId: comp1Id, eventCode: '333'}, { sort: { nthRound: 1 } }).fetch();
        chai.expect(rounds.length).to.equal(2);

        let createRegistration = function({checkedIn}) {
          let registration = Registrations.findOne(Meteor.call('addEditRegistration', build(Registrations, {competitionId: comp1Id, registeredEvents: ['333']})));
          if(checkedIn) {
            Meteor.call('checkInRegistration', registration._id, true);
          }
          let result = Results.findOne({ roundId: rounds[0]._id, registrationId: registration._id });
          return [ registration, result ];
        };

        [registration1, result1] = createRegistration({ checkedIn: true });
        fillResultWithSolve(result1, { millis: 3333 });

        [registration2, result2] = createRegistration({ checkedIn: true });
        fillResultWithSolve(result2, { millis: 4444 });

        [uncheckedInRegistration, uncheckedInResult] = createRegistration({ checkedIn: false });
        let [registration4, incompleteResult4] = createRegistration({ checkedIn: true });

        Meteor.call('advanceParticipantsFromRound', 1, rounds[0]._id);
        secondResult1 = Results.findOne({ roundId: rounds[1]._id, registrationId: registration1._id });
        chai.expect(Results.find({ roundId: rounds[1]._id }).count()).to.equal(1);
        chai.expect(Rounds.findOne(rounds[1]._id).size).to.equal(1);
      });

      it("getBestNotAdvancedResultFromRoundPreviousToThisOne", function() {
        let result = Meteor.call('getBestNotAdvancedResultFromRoundPreviousToThisOne', rounds[1]._id);
        chai.expect(result._id).to.equal(result2._id);
      });

      describe("setResultNoShow", function() {
        it('works', function() {
          Meteor.call('setResultNoShow', secondResult1._id, true);
          chai.expect(Results.findOne(secondResult1._id).noShow).to.equal(true);
          chai.expect(Rounds.findOne(rounds[1]._id).size).to.equal(0);

          Meteor.call('setResultNoShow', secondResult1._id, false);
          chai.expect(Results.findOne(secondResult1._id).noShow).to.equal(false);
          chai.expect(Rounds.findOne(rounds[1]._id).size).to.equal(1);
        });

        it("does not allow marking someone a no show if they're not checked in", function() {
          chai.expect(function() {
            Meteor.call('setResultNoShow', uncheckedInResult._id, true);
          }).to.throw(Meteor.Error);
        });
      });

      it("advanceResultIdFromRoundPreviousToThisOne", function() {
        chai.expect(Results.findOne({ roundId: rounds[1]._id, registrationId: registration2._id })).to.not.exist;
        chai.expect(Results.findOne({ roundId: rounds[0]._id, registrationId: registration2._id }).advanced).to.equal(false);
        chai.expect(Rounds.findOne(rounds[1]._id).size).to.equal(1);

        Meteor.call('advanceResultIdFromRoundPreviousToThisOne', result2._id, rounds[1]._id);
        chai.expect(Results.findOne({ roundId: rounds[1]._id, registrationId: registration2._id })).to.exist;
        chai.expect(Results.findOne({ roundId: rounds[0]._id, registrationId: registration2._id }).advanced).to.equal(true);
        chai.expect(Rounds.findOne(rounds[1]._id).size).to.equal(2);

        // Trying to advance someone who is already advanced should not work.
        chai.expect(function() {
          Meteor.call('advanceResultIdFromRoundPreviousToThisOne', result2._id, rounds[1]._id);
        }).to.throw(Meteor.Error);
      });

      it("advanceResultIdFromRoundPreviousToThisOne requires result from previous round ", function() {
        let randomResult = Results.findOne(Results.insert({ competitionId: comp1Id, roundId: "FOO", registrationId: registration1._id, position: 1 }));
        chai.expect(function() {
          Meteor.call('advanceResultIdFromRoundPreviousToThisOne', randomResult._id, rounds[1]._id);
        }).to.throw(Meteor.Error);
      });
    });

  });
});

let fillResultWithSolve = function(result, solveTime) {
  _.range(5).forEach(i => result.setSolveTime(i, solveTime));
};
