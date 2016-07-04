MochaWeb.testOnly(function() {
  describe('Registration and checkin methods', function() {
    let comp;
    let firstRound222, firstRound333;
    beforeEach(function() {
      stubs.create('fakeCanManageCompetition', global, 'getCannotManageCompetitionReason');
      stubs.fakeCanManageCompetition.returns(null);

      comp = make(Competitions);

      Meteor.call('addRound', comp._id, '333');
      firstRound333 = comp.getFirstRoundOfEvent('333');

      Meteor.call('addRound', comp._id, '222');
      firstRound222 = comp.getFirstRoundOfEvent('222');
    });

    describe('registration', function() {
      describe("addEditRegistration", function() {
        let registration;
        beforeEach(function() {
          registration = build(Registrations, {
            competitionId: comp._id,
            registeredEvents: [],
          });
        });

        it('cannot register for 444 (since 444 is not being held at competition)', function() {
          registration.registeredEvents.push('333');
          registration.registeredEvents.push('444');
          chai.expect(function() {
            Meteor.call('addEditRegistration', registration);
          }).to.throw(Meteor.Error);
        });

        it('cannot change competitionId of existing registration', function() {
          registration = Registrations.findOne(Meteor.call('addEditRegistration', registration));
          registration.competitionId = make(Competitions)._id;
          chai.expect(function() {
            Meteor.call('addEditRegistration', registration);
          }).to.throw(Meteor.Error);
        });

        it('can create *and* edit a registration', function() {
          registration = Registrations.findOne(Meteor.call('addEditRegistration', registration));
          chai.expect(registration).to.exist;
          chai.expect(registration.registeredEvents).to.deep.equal([]);

          registration.registeredEvents.push('333');
          Meteor.call('addEditRegistration', registration);
          registration = Registrations.findOne(registration._id);
          chai.expect(registration.registeredEvents).to.deep.equal(['333']);
          let result333 = Results.findOne({
            roundId: firstRound333._id,
            registrationId: registration._id
          });
          chai.expect(result333).to.exist;

          registration.registeredEvents.push('222');
          Meteor.call('addEditRegistration', registration);
          registration = Registrations.findOne(registration._id);
          chai.expect(registration.registeredEvents.sort()).to.deep.equal(['222', '333']);
          let result222 = Results.findOne({
            roundId: firstRound333._id,
            registrationId: registration._id
          });
          chai.expect(result222).to.exist;
        });

        describe("unregistering", function() {
          let result333;
          beforeEach(function() {
            registration.registeredEvents.push('333');
            registration = Registrations.findOne(Meteor.call('addEditRegistration', registration));
            chai.expect(registration.registeredEvents).to.deep.equal(['333']);
            result333 = Results.findOne({
              roundId: firstRound333._id,
              registrationId: registration._id
            });
            chai.expect(result333).to.exist;
          });

          it('from 333 works', function() {
            registration.registeredEvents = [];
            Meteor.call('addEditRegistration', registration);
            chai.expect(Results.findOne(result333._id)).to.not.exist;
          });

          it('from 333 not allowed with solves', function() {
            result333.setSolveTime(0, { millis: 3333 });

            registration.registeredEvents = [];
            chai.expect(function() {
              Meteor.call('addEditRegistration', registration);
            }).to.throw(Meteor.Error);
          });

          describe("deleteRegistration", function() {
            it('works with no solves', function() {
              Meteor.call('deleteRegistration', registration._id);
              chai.expect(Results.findOne(result333._id)).to.not.exist;
            });

            it('refuses to delete solves', function() {
              result333.setSolveTime(0, { millis: 3333 });

              chai.expect(function() {
                Meteor.call('deleteRegistration', registration._id);
              }).to.throw(Meteor.Error);
            });
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

          Meteor.call('importRegistrations', comp._id, competitionJson);
          let registrations = _.sortBy(Registrations.find({ competitionId: comp._id }).fetch(), registration => registration.uniqueName);
          let firstRound333oh = comp.getFirstRoundOfEvent('333oh');

          chai.expect(registrations.length).to.equal(2);

          chai.expect(registrations[0].uniqueName).to.equal("Jeremy Fleischman");
          chai.expect(registrations[0].countryId).to.equal("US");
          chai.expect(registrations[0].registeredEvents).to.deep.equal(["333", "333oh"]);
          chai.expect(registrations[0].userId).to.equal(jeremyUser._id);
          chai.expect(Results.findOne({roundId: firstRound333._id, registrationId: registrations[0]._id})).to.exist;
          chai.expect(Results.findOne({roundId: firstRound333oh._id, registrationId: registrations[0]._id})).to.exist;

          chai.expect(registrations[1].uniqueName).to.equal("Patricia Li");
          chai.expect(registrations[1].registeredEvents).to.deep.equal(["333"]);
          chai.expect(registrations[1].userId).to.not.exist;
          chai.expect(Results.findOne({roundId: firstRound333._id, registrationId: registrations[1]._id})).to.exist;

          // Remove Jeremy from 333 round 1.
          competitionJson.events[0].rounds[0].results.shift();
          // Change Jeremy's country to Israel
          competitionJson.persons[0].countryId = "IL";
          // Add Patricia to round 333oh round 1.
          competitionJson.events[1].rounds[0].results.push({ personId: 2 });
          // Import the JSON again, Patricia should now be signed up for 333oh, and
          // Jeremy should be removed from 333 round 1, since neither of them was
          // checked in.
          Meteor.call('importRegistrations', comp._id, competitionJson);
          registrations = _.sortBy(Registrations.find({ competitionId: comp._id }).fetch(), registration => registration.uniqueName);

          chai.expect(registrations.length).to.equal(2);

          chai.expect(registrations[0].uniqueName).to.equal("Jeremy Fleischman");
          chai.expect(registrations[0].countryId).to.equal("IL");
          chai.expect(registrations[0].registeredEvents).to.deep.equal(["333oh"]);
          chai.expect(Results.findOne({roundId: firstRound333._id, registrationId: registrations[0]._id})).to.not.exist;
          chai.expect(Results.findOne({roundId: firstRound333oh._id, registrationId: registrations[0]._id})).to.exist;

          chai.expect(registrations[1].uniqueName).to.equal("Patricia Li");
          chai.expect(registrations[1].registeredEvents).to.deep.equal(["333", "333oh"]);
          chai.expect(Results.findOne({roundId: firstRound333._id, registrationId: registrations[1]._id})).to.exist;
          chai.expect(Results.findOne({roundId: firstRound333oh._id, registrationId: registrations[1]._id})).to.exist;

          // Check Patricia in.
          Meteor.call('checkInRegistration', registrations[1]._id, true);
          // Remove Patricia from 333oh round 1.
          competitionJson.events[1].rounds[0].results.pop();
          // And add her to 222 round 1.
          competitionJson.events[2].rounds[0].results.push({ personId: "2" });
          // Reimporting should not change her events, because she's already
          // checked in.
          Meteor.call('importRegistrations', comp._id, competitionJson);
          registrations = _.sortBy(Registrations.find({ competitionId: comp._id }).fetch(), registration => registration.uniqueName);

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

          Meteor.call('importRegistrations', comp._id, competitionJson);
          chai.expect(Rounds.find({ competitionId: comp._id, eventCode: "333" }).count()).to.equal(1);
          chai.expect(Rounds.find({ competitionId: comp._id, eventCode: "333oh" }).count()).to.equal(2);
          chai.expect(Rounds.find({ competitionId: comp._id, eventCode: "222" }).count()).to.equal(1);
        });
      });
    });

    describe('manage check-in', function() {
      let registration;
      let result;
      beforeEach(function() {
        registration = Registrations.findOne(Meteor.call('addEditRegistration', build(Registrations, {
          competitionId: comp._id,
          registeredEvents: ['333'],
        })));
        let results = Results.find({registrationId: registration._id, roundId: firstRound333._id}).fetch();
        chai.expect(results.length).to.equal(1);
        result = results[0];
      });

      describe('when not checked in', function() {
        it('toggleEventRegistration', function() {
          chai.expect(Results.find({registrationId: registration._id, roundId: firstRound222._id}).count()).to.equal(0);
          Meteor.call('toggleEventRegistration', registration._id, '222');
          chai.expect(Results.find({registrationId: registration._id, roundId: firstRound222._id}).count()).to.equal(1);
          chai.expect(Registrations.findOne(registration._id).registeredEvents.sort()).to.deep.equal(['222', '333']);
        });
      });

      describe('when checked in', function() {
        beforeEach(function() {
          Meteor.call('checkInRegistration', registration._id, true);
          chai.expect(Registrations.findOne(registration._id).checkedIn).to.equal(true);
        });

        it('checking out without times works', function() {
          Meteor.call('checkInRegistration', registration._id, false);
          chai.expect(Registrations.findOne(registration._id).checkedIn).to.equal(false);
          chai.expect(Results.findOne(result._id)).to.exist;
        });

        it('checking out with times throws an exception', function() {
          Meteor.call('setSolveTime', result._id, 0, { millis: 3333 });
          chai.expect(function() {
            Meteor.call('checkInRegistration', registration._id, false);
          }).to.throw(Meteor.Error);
          chai.expect(Registrations.findOne(registration._id).checkedIn).to.equal(true);
          chai.expect(Results.findOne(result._id)).to.exist;
        });
      });
    });
  });
});
