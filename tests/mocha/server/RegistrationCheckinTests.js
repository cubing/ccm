MochaWeb.testOnly(function() {
  describe('Registration and checkin methods', function() {
    let comp1Id;
    beforeEach(function() {
      comp1Id = Competitions.insert({ competitionName: "Comp One", listed: false, startDate: new Date() });

      stubs.create('fakeCanManageCompetition', global, 'getCannotManageCompetitionReason');
      stubs.fakeCanManageCompetition.returns(null);
    });

    describe('manage check-in', function() {
      let registration;
      let firstRound333;
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
        let result;
        beforeEach(function() {
          Meteor.call('checkInRegistration', registration._id, true);
          Meteor.call('toggleEventRegistration', registration._id, '333');
          let results = Results.find({registrationId: registration._id, roundId: firstRound333._id}).fetch();
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

    describe('importRegistrations', function() {
      it('works', function() {
        let competitionJson = {
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
          ]
        };

        let jeremyUser = make(Meteor.users);
        Meteor.users.update(jeremyUser._id, { $set: { 'profile.wcaId': "2005FLEI01" } });

        Meteor.call('importRegistrations', comp1Id, competitionJson);
        let registrations = _.sortBy(Registrations.find({ competitionId: comp1Id }).fetch(), registration => registration.uniqueName);

        chai.expect(registrations.length).to.equal(2);

        chai.expect(registrations[0].uniqueName).to.equal("Jeremy Fleischman");
        chai.expect(registrations[0].countryId).to.equal("US");
        chai.expect(registrations[0].registeredEvents).to.deep.equal(["333", "333oh"]);
        chai.expect(registrations[0].userId).to.equal(jeremyUser._id);

        chai.expect(registrations[1].uniqueName).to.equal("Patricia Li");
        chai.expect(registrations[1].registeredEvents).to.deep.equal(["333"]);
        chai.expect(registrations[1].userId).to.not.exist;

        // Remove Jeremy from 333 round 1.
        competitionJson.events[0].rounds[0].results.shift();
        // Change Jeremy's country to Israel
        competitionJson.persons[0].countryId = "IL";
        // Add Patricia to round 333oh round 1.
        competitionJson.events[1].rounds[0].results.push({ personId: 2 });
        // Import the JSON again, Patricia should now be signed up for 333oh, and
        // Jeremy should be removed from 333 round 1, since neither of them was
        // checked in.
        Meteor.call('importRegistrations', comp1Id, competitionJson);
        registrations = _.sortBy(Registrations.find({ competitionId: comp1Id }).fetch(), registration => registration.uniqueName);

        chai.expect(registrations.length).to.equal(2);

        chai.expect(registrations[0].uniqueName).to.equal("Jeremy Fleischman");
        chai.expect(registrations[0].countryId).to.equal("IL");
        chai.expect(registrations[0].registeredEvents).to.deep.equal(["333oh"]);

        chai.expect(registrations[1].uniqueName).to.equal("Patricia Li");
        chai.expect(registrations[1].registeredEvents).to.deep.equal(["333", "333oh"]);

        // Check Patricia in.
        Meteor.call('checkInRegistration', registrations[1]._id, true);
        // Remove Patricia from 333oh round 1.
        competitionJson.events[1].rounds[0].results.pop();
        // And add her to 222 round 1.
        competitionJson.events[2].rounds[0].results.push({ personId: "2" });
        // Reimporting should not change her events, because she's already
        // checked in.
        Meteor.call('importRegistrations', comp1Id, competitionJson);
        registrations = _.sortBy(Registrations.find({ competitionId: comp1Id }).fetch(), registration => registration.uniqueName);

        chai.expect(registrations.length).to.equal(2);

        chai.expect(registrations[0].uniqueName).to.equal("Jeremy Fleischman");
        chai.expect(registrations[0].registeredEvents).to.deep.equal(["333oh"]);

        chai.expect(registrations[1].uniqueName).to.equal("Patricia Li");
        chai.expect(registrations[1].registeredEvents).to.deep.equal(["333", "333oh"]);
      });

      it('adds missing events', function() {
        let competitionJson = {
          "formatVersion": "WCA Competition 0.2",
          "competitionId": "PleaseBeQuiet2015",
          "persons": [
          ],
          "events": [
            {
              "eventId": "333",
              "rounds": [
                {
                  "roundId": "f",
                  "formatId": "a",
                  "results": [],
                  "groups": []
                },
              ]
            },
            {
              "eventId": "333oh",
              "rounds": [
                {
                  "roundId": "1",
                  "formatId": "a",
                  "results": [],
                  "groups": []
                },
                {
                  "roundId": "f",
                  "formatId": "a",
                  "results": [],
                  "groups": []
                },
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
                },
              ]
            },
          ]
        };

        Meteor.call('importRegistrations', comp1Id, competitionJson);
        chai.expect(Rounds.find({ competitionId: comp1Id, eventCode: "333" }).count()).to.equal(1);
        chai.expect(Rounds.find({ competitionId: comp1Id, eventCode: "333oh" }).count()).to.equal(2);
        chai.expect(Rounds.find({ competitionId: comp1Id, eventCode: "222" }).count()).to.equal(1);
      });
    });

    describe("deleteRegistration", function() {
      it('works', function() {
        Meteor.call('deleteRegistration');//<<<
      });
    });

    describe("addEditRegistration", function() {
      it('works', function() {
        Meteor.call('addEditRegistration');//<<<
      });
    });
  });
});
