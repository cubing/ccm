Competitions = new Meteor.Collection("competitions");

if(Meteor.isClient) {
  Template.competitions.allComps = function() {
     return Competitions.find();
  };
}

if(Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
    var testComp = {
      "competitionId": "ExampleCompetition2013",
      "persons": [],
      "events": [],
      "staff": []
    };

    Competitions.update(
      testComp,
      testComp,
      { upsert: true }
    );
  });
}
