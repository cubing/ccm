Competitions = new Meteor.Collection("competitions");
People = new Meteor.Collection("people");
Rounds = new Meteor.Collection("rounds");
Results = new Meteor.Collection("results");
Groups = new Meteor.Collection("groups");

if(Meteor.isClient) {
  Template.compsTemplate.allComps = function() {
    return Competitions.find({}, {
      fields: {
        wcaCompetitionId: 1
      }
    });
  };

  Template.compTemplate.events = function() {
    var events = Rounds.find(
      { competitionId: this.competitionId },
      { fields: { eventCode: 1 } }
    ).fetch();

    events = _.uniq(events, function(e) { return e.eventCode; });
    return events; 
  };

  Template.compTemplate.rounds = function() {
    var rounds = Rounds.find(
      { competitionId: this.competitionId, eventCode: this.eventCode }
    );
    return rounds;
  };

  Template.roundTemplate.results = function() {
    var results = Results.find(
      { roundId: this.round._id },
      {}
    );
    return results;
  };
}

if(Meteor.isServer) {
  Meteor.startup(function () {
    var res;

    // code to run on server at startup
    var competition = {
      wcaCompetitionId: "ExampleCompetition2013",
      people: [],
      staff: [],
      organizers: []
    };
    res = Competitions.upsert(
      { wcaCompetitionId: competition.wcaCompetitionId },
      competition
    );
    var competitionId = res.insertedId;

    var person = {
      name: "Devin Corr-Robinett",
      wcaId: "2006CORR01",
      countryId: "US",
      gender: "o",
      dob: "1900-01-01"
    };
    res = People.upsert(
      { wcaId: person.wcaId },
      person
    );
    var personId = res.insertedId;

    var round = {
      competitionId: competitionId,
      eventCode: "333",
      roundCode: "d",
      formatCode: "a"
    };
    res = Rounds.upsert(
      round,
      round
    );
    var roundId = res.insertedId;

    var result = {
      roundId: roundId,
      competitionId: competitionId,
      personId: personId,
      position: "1",
      solves: [ 600, 700, 648, 727, 1063 ],
      best: 600,
      average: 692
    };
    Results.upsert(
      {
        roundId: result.roundId,
        competitionId: result.competitionId,
        personId: result.personId,
      },
      result
    );

    var testComp = {
      "competitionId": "ExampleCompetition2013",
      "persons": {
        "1": {
          id: "1",
          name: "me two",
          wcaId: "2013TWOM01",
          countryId: "US",
          gender: "o",
          dob: "2000-01-01"
        },
        "2": {
          id: "2",
          name: "me three",
          wcaId: "2013THRE01",
          countryId: "US",
          gender: "o",
          dob: "1993-05-01"
        }
      },
      "events": [
        {
          eventId: "333",
          rounds: [
            {
              roundId: "1",
              formatId: "d",
              results: {
                "1":{
                  personId:"1",
                  position:"1",
                  results:[600, 700, 648, 727, 1063],
                  best: 600,
                  average: 692
                },
                "2":{
                  "personId":"2",
                  "position":"2",
                  "results":[1602,1509,1421,-1,2022],
                  "best":1421,
                  "average":1711
                }
              }
            },
            {
              roundId: "f",
              formatId: "a",
              results: {
                "1":{
                  personId:"1",
                  position:"1",
                  results:[600, 700, 648, 727, 1063],
                  best: 600,
                  average: 692
                },
                "2":{
                  "personId":"2",
                  "position":"2",
                  "results":[1602,1509,1421,-1,2022],
                  "best":1421,
                  "average":1711
                }
              }
            },
          ],
          "groups":{
            "A":{
              "group":"A",
              "scrambles": [
                "U' R F' R' U R' U F' U' R U",
                "U' R' U' F' R U R U' R2 F R'",
                "R' F U2 R U R2 U' F R2 U' R'",
                "U' R' F U' R2 U2 F' R' U' R' U",
                "U R U2 F' R' U' R U2 R' U' F"
              ],
              "extraScrambles": [ 
                "U2 R U' F' R2 F R F R2 U2 R'",
                "R2 U' R2 F' U' R2 U' R2 F U2 R"
              ]
            }
          }
        },
        {
          eventId: "444",
          rounds: [{
            roundId: "f",
            formatId: "a",
            results:{
              1:{
                personId:1,
                position:1,
                results:[600, 700, 648, 727, 1063],
                best: 600,
                average: 692
              },
              2:{
                "personId":2,
                "position":2,
                "results":[1602,1509,1421,-1,2022],
                "best":1421,
                "average":1711
              }
            }
          }],
          "groups":{
            "A":{
              "group":"A",
              "scrambles": [
                "U' R F' R' U R' U F' U' R U",
                "U' R' U' F' R U R U' R2 F R'",
                "R' F U2 R U R2 U' F R2 U' R'",
                "U' R' F U' R2 U2 F' R' U' R' U",
                "U R U2 F' R' U' R U2 R' U' F"
              ],
              "extraScrambles": [ 
                "U2 R U' F' R2 F R F R2 U2 R'",
                "R2 U' R2 F' U' R2 U' R2 F U2 R"
              ]
            }
          }
        }
      ],
      "staff": []
    };

  });
}
