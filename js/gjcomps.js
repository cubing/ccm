Competitions = new Meteor.Collection("competitions");

if(Meteor.isClient) {
  Template.compsTemplate.allComps = function() {
    return Competitions.find({}, {
      fields: {
        competitionId: 1
      }
    });
  };

  Template.compTemplate.events = function() {
    // This will run every time *anything* changes in the competition's entire
    // events subdocument, eg: when a new time is entered.

    var competitionId = Router.current().params.competitionId;
    var comp = Competitions.findOne(
      { 
        competitionId: competitionId
        //"events.eventId": {$in: _.pluck(wca.events,"id")}
      },
      {
        fields: { 
          "events": {$elemMatch:{eventId:{$in:_.pluck(wca.events,"id")}}} 
        },
      }
    );
    var events = [];
    console.log(comp.events);
    if(comp) {
      for(var key in comp.events) {
        if(comp.events.hasOwnProperty(key)) {
          events.push(comp.events[key]);
        }
      }
    }
    
    return events; 
  };
}

if(Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
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

    

    Competitions.update(
      testComp,
      testComp,
      { upsert: true }
    );
    testComp.competitionId="WhoWhatWhere2015";
    Competitions.update(
      testComp,
      testComp,
      { upsert: true }
    );
  });
}
